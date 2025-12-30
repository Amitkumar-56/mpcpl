import { executeQuery, executeTransaction } from "@/lib/db";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

export async function GET() {
  try {
    console.log("🔍 Fetching form data from database...");
    
    const [stations, products] = await Promise.all([
      executeQuery("SELECT * FROM filling_stations"),
      executeQuery("SELECT * FROM products")
    ]);

    console.log("📊 Stations found:", stations?.length);
    console.log("📦 Products found:", products?.length);

    return NextResponse.json({
      stations: stations || [],
      products: products || []
    });
  } catch (error) {
    console.error("❌ Error fetching form data:", error);
    return NextResponse.json(
      { error: "Failed to fetch form data: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log("🚀 Starting stock transfer creation...");
    
    const formData = await request.formData();
    
    const station_from = formData.get('station_from');
    const station_to = formData.get('station_to');
    const driver_id = formData.get('driver_id');
    const vehicle_id = formData.get('vehicle_id');
    const transfer_quantity = formData.get('transfer_quantity');
    const status = formData.get('status') || '1';
    const product = formData.get('product');
    const product_to = formData.get('product_to'); // For same depot transfer
    const slip = formData.get('slip');
    
    // ✅ NEW: Check if same depot transfer (Industrial Oil 40 <-> 60)
    const isSameDepotTransfer = station_from === station_to && product_to;

    console.log("📝 Form data:", { 
      station_from, station_to, driver_id, vehicle_id, 
      transfer_quantity, product, status 
    });

    // Validate required fields
    if (!station_from || !station_to || !driver_id || !vehicle_id || !transfer_quantity || !product) {
      return NextResponse.json(
        { error: "All required fields must be filled" },
        { status: 400 }
      );
    }
    
    // ✅ NEW: For same depot transfer, validate product_to
    if (isSameDepotTransfer && !product_to) {
      return NextResponse.json(
        { error: "Product To is required for same depot transfer" },
        { status: 400 }
      );
    }
    
    // ✅ NEW: For same depot transfer, validate it's Industrial Oil 40 or 60
    if (isSameDepotTransfer && (product != 2 && product != 3) || (product_to != 2 && product_to != 3)) {
      return NextResponse.json(
        { error: "Same depot transfer is only allowed between Industrial Oil 40 and Industrial Oil 60" },
        { status: 400 }
      );
    }

    let slip_new_name = null;

    // Handle file upload
    if (slip && slip.size > 0) {
      console.log("📎 Processing file upload...");
      if (slip.size > 1000000) {
        return NextResponse.json(
          { error: "File size is too large. Maximum 1MB allowed." },
          { status: 400 }
        );
      }

      try {
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public/uploads');
        try {
          await mkdir(uploadsDir, { recursive: true });
        } catch (dirError) {
          // Directory already exists
        }

        const fileExtension = path.extname(slip.name);
        slip_new_name = `${Date.now()}_${Math.random().toString(36).substring(2)}${fileExtension}`;
        
        const bytes = await slip.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const uploadPath = path.join(uploadsDir, slip_new_name);
        await writeFile(uploadPath, buffer);
        console.log("✅ File saved:", slip_new_name);
      } catch (fileError) {
        console.error("❌ File upload error:", fileError);
        return NextResponse.json(
          { error: "Failed to upload file" },
          { status: 500 }
        );
      }
    }

    // Check available stock
    console.log("📦 Checking available stock...");
    
    let available_stock_from = null;
    let stockQueryUsed = "product";
    
    // Try different possible column names
    const stockQueries = [
      { query: "SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product_id = ?", name: "product_id" },
      { query: "SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?", name: "product" },
      { query: "SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND p_id = ?", name: "p_id" }
    ];

    for (const stockQuery of stockQueries) {
      try {
        console.log(`🔍 Trying: ${stockQuery.name}`);
        const stockResult = await executeQuery(stockQuery.query, [station_from, product]);
        
        if (stockResult.length > 0) {
          available_stock_from = parseFloat(stockResult[0].stock);
          stockQueryUsed = stockQuery.name;
          console.log(`✅ Stock found: ${available_stock_from} using ${stockQuery.name}`);
          break;
        }
      } catch (queryError) {
        console.log(`❌ Query failed with ${stockQuery.name}`);
      }
    }

    if (available_stock_from === null) {
      return NextResponse.json(
        { error: "No stock record found for the selected product at source station" },
        { status: 400 }
      );
    }

    const transferQuantity = parseFloat(transfer_quantity);

    if (available_stock_from < transferQuantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${available_stock_from}, Requested: ${transferQuantity}` },
        { status: 400 }
      );
    }

    // ✅ Get user ID from cookies/token BEFORE transaction
    let userId = null;
    let userName = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0 && users[0].name) {
            userName = users[0].name;
          }
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }
    
    // Return error if no user found
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login again.' },
        { status: 401 }
      );
    }
    
    console.log('✅ User info for transfer:', { userId, userName });

    // Use executeTransaction helper to avoid prepared statement error
    console.log("💳 Starting transaction...");
    const result = await executeTransaction(async (connection) => {
      let new_stock_from;
      let new_stock_to = null;
      
      // ✅ NEW: Handle same depot transfer (Industrial Oil 40 <-> 60)
      if (isSameDepotTransfer) {
        // Deduct from source product
        new_stock_from = available_stock_from - transferQuantity;
        const updateStockQueryFrom = `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND ${stockQueryUsed} = ?`;
        await connection.execute(updateStockQueryFrom, [new_stock_from, station_from, product]);
        
        // Add to destination product (same station, different product)
        const [stockToResult] = await connection.execute(
          `SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND ${stockQueryUsed} = ?`,
          [station_to, product_to]
        );
        
        if (stockToResult.length > 0) {
          const current_stock_to = parseFloat(stockToResult[0].stock) || 0;
          new_stock_to = current_stock_to + transferQuantity;
          await connection.execute(
            `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND ${stockQueryUsed} = ?`,
            [new_stock_to, station_to, product_to]
          );
        } else {
          // Create new stock record for destination product
          new_stock_to = transferQuantity;
          await connection.execute(
            `INSERT INTO filling_station_stocks (fs_id, ${stockQueryUsed}, stock, created_at) VALUES (?, ?, ?, NOW())`,
            [station_to, product_to, new_stock_to]
          );
        }
        
        // ✅ Insert inward history for destination product
        const insertHistoryQueryInward = `
          INSERT INTO filling_history 
            (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
          VALUES (?, ?, 'Inward', ?, ?, ?, NOW(), ?, NOW())
        `;
        const current_stock_to_before = stockToResult.length > 0 ? parseFloat(stockToResult[0].stock) || 0 : 0;
        await connection.execute(insertHistoryQueryInward, [
          station_to, product_to, current_stock_to_before, transferQuantity, new_stock_to, userId
        ]);
        
        console.log(`✅ Same depot transfer: ${transferQuantity} from product ${product} to product ${product_to}`);
      } else {
        // Regular transfer between different stations
        new_stock_from = available_stock_from - transferQuantity;
        const updateStockQuery = `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND ${stockQueryUsed} = ?`;
        
        console.log("🔄 Updating stock...");
        await connection.execute(updateStockQuery, [new_stock_from, station_from, product]);
      }

      // Insert into stock_transfers
      const insertTransferQuery = `
        INSERT INTO stock_transfers (
          station_from, station_to, driver_id, vehicle_id, 
          transfer_quantity, status, slip, product, product_to, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      console.log("📝 Inserting transfer...");
      const [transferResult] = await connection.execute(insertTransferQuery, [
        station_from, station_to, driver_id, vehicle_id,
        transferQuantity, status, slip_new_name, product, product_to || null
      ]);
      
      // ✅ Insert into filling_history with created_by (Outward for source)
      const insertHistoryQuery = `
        INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
        VALUES (?, ?, 'Outward', ?, ?, ?, NOW(), ?, NOW())
      `;
      
      console.log("📚 Adding to history with user:", userId);
      await connection.execute(insertHistoryQuery, [
        station_from, product, available_stock_from, -transferQuantity, new_stock_from, userId
      ]);
      
      // ✅ For regular transfer (different stations), also add Inward to destination
      if (!isSameDepotTransfer && station_from !== station_to) {
        // Check destination stock
        const [destStockResult] = await connection.execute(
          `SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND ${stockQueryUsed} = ?`,
          [station_to, product]
        );
        
        let destCurrentStock = 0;
        let destNewStock = transferQuantity;
        
        if (destStockResult.length > 0) {
          destCurrentStock = parseFloat(destStockResult[0].stock) || 0;
          destNewStock = destCurrentStock + transferQuantity;
          // Update destination stock
          await connection.execute(
            `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND ${stockQueryUsed} = ?`,
            [destNewStock, station_to, product]
          );
        } else {
          // Insert new stock record for destination
          await connection.execute(
            `INSERT INTO filling_station_stocks (fs_id, ${stockQueryUsed}, stock, created_at) VALUES (?, ?, ?, NOW())`,
            [station_to, product, destNewStock]
          );
        }
        
        // Insert Inward history for destination
        const insertHistoryQueryInward = `
          INSERT INTO filling_history 
            (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at)
          VALUES (?, ?, 'Inward', ?, ?, ?, NOW(), ?, NOW())
        `;
        await connection.execute(insertHistoryQueryInward, [
          station_to, product, destCurrentStock, transferQuantity, destNewStock, userId
        ]);
        console.log("✅ Inward history added for destination station");
      }
      
      // Also create a log entry for stock transfer with employee name
      try {
        // ✅ Fetch employee name for stock transfer log
        let employeeName = null;
        if (userId) {
          try {
            const [empResult] = await connection.execute(
              `SELECT name FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (empResult && empResult.length > 0 && empResult[0].name) {
              employeeName = empResult[0].name;
            }
          } catch (empError) {
            console.error('Error fetching employee name for transfer log:', empError);
          }
        }
        
        // Check if performed_by_name column exists
        const colsInfo = await connection.execute(`SHOW COLUMNS FROM stock_transfer_logs LIKE 'performed_by_name'`);
        let insertQuery = '';
        let insertParams = [];
        
        if (colsInfo.length > 0) {
          // Column exists, include it
          insertQuery = `
            INSERT INTO stock_transfer_logs 
              (transfer_id, action, performed_by, performed_by_name, performed_at, station_from, station_to, quantity, product_id)
            VALUES (?, 'Created', ?, ?, NOW(), ?, ?, ?, ?)
          `;
          insertParams = [
            transferResult.insertId, 
            userId, 
            employeeName || (userId ? `Employee ID: ${userId}` : 'Unknown'), 
            station_from, 
            station_to, 
            transferQuantity, 
            product
          ];
        } else {
          // Column doesn't exist, use old format
          insertQuery = `
            INSERT INTO stock_transfer_logs 
              (transfer_id, action, performed_by, performed_at, station_from, station_to, quantity, product_id)
            VALUES (?, 'Created', ?, NOW(), ?, ?, ?, ?)
          `;
          insertParams = [
            transferResult.insertId, 
            userId, 
            station_from, 
            station_to, 
            transferQuantity, 
            product
          ];
        }
        
        await connection.execute(insertQuery, insertParams);
        console.log("✅ Stock transfer log created with employee name:", employeeName);
      } catch (logError) {
        console.log("⚠️ Stock transfer logs table may not exist, skipping:", logError.message);
      }

      // Get station names for audit log
      let stationFromName = `Station ${station_from}`;
      let stationToName = `Station ${station_to}`;
      let productName = `Product ${product}`;
      try {
        const [stations] = await connection.execute(
          `SELECT id, station_name FROM filling_stations WHERE id IN (?, ?)`,
          [station_from, station_to]
        );
        const fromStation = stations.find(s => s.id == station_from);
        const toStation = stations.find(s => s.id == station_to);
        if (fromStation) stationFromName = fromStation.station_name;
        if (toStation) stationToName = toStation.station_name;
        
        const [products] = await connection.execute(
          `SELECT id, pname FROM products WHERE id = ?`,
          [product]
        );
        if (products.length > 0) {
          productName = products[0].pname;
        }
      } catch (nameError) {
        console.error('Error fetching names:', nameError);
      }

      console.log("🎉 Stock transfer created successfully!");
      return { 
        transferResult, 
        stationFromName, 
        stationToName, 
        productName, 
        userId, 
        userName, 
        available_stock_from, 
        new_stock_from: new_stock_from || (available_stock_from - transferQuantity),
        transferQuantity 
      };
    });

    // Create audit log after transaction
    await createAuditLog({
      page: 'Stock Transfers',
      uniqueCode: `TRANSFER-${result.transferResult.insertId}`,
      section: 'Create Transfer',
      userId: result.userId,
      userName: result.userName,
      action: 'add',
      remarks: `Stock transferred: ${result.transferQuantity} Ltr of ${result.productName} from ${result.stationFromName} to ${result.stationToName}`,
      oldValue: { stock: result.available_stock_from, station_id: station_from, product_id: product },
      newValue: { stock: result.new_stock_from, station_id: station_from, product_id: product, transferred_to: station_to, quantity: result.transferQuantity },
      fieldName: 'stock',
      recordType: 'stock_transfer',
      recordId: result.transferResult.insertId
    });

    return NextResponse.json({
      message: "Stock transfer created successfully",
      transferId: result.transferResult.insertId
    });

  } catch (error) {
    console.error("❌ Error creating stock transfer:", error);
    return NextResponse.json(
      { error: "Failed to create stock transfer: " + error.message },
      { status: 500 }
    );
  }
}