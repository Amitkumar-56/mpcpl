import { executeQuery, executeTransaction } from "@/lib/db";
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

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
    const slip = formData.get('slip');

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

    // Use executeTransaction helper to avoid prepared statement error
    console.log("💳 Starting transaction...");
    const result = await executeTransaction(async (connection) => {
      // Update source station stock
      const new_stock_from = available_stock_from - transferQuantity;
      const updateStockQuery = `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND ${stockQueryUsed} = ?`;
      
      console.log("🔄 Updating stock...");
      await connection.execute(updateStockQuery, [new_stock_from, station_from, product]);

      // Insert into stock_transfers
      const insertTransferQuery = `
        INSERT INTO stock_transfers (
          station_from, station_to, driver_id, vehicle_id, 
          transfer_quantity, status, slip, product, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      console.log("📝 Inserting transfer...");
      const [transferResult] = await connection.execute(insertTransferQuery, [
        station_from, station_to, driver_id, vehicle_id,
        transferQuantity, status, slip_new_name, product
      ]);

      // Insert into filling_history
      const insertHistoryQuery = `
        INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date)
        VALUES (?, ?, 'Outward', ?, ?, ?, NOW())
      `;
      
      console.log("📚 Adding to history...");
      await connection.execute(insertHistoryQuery, [
        station_from, product, available_stock_from, transferQuantity, new_stock_from
      ]);

      console.log("🎉 Stock transfer created successfully!");
      return transferResult;
    });

    return NextResponse.json({
      message: "Stock transfer created successfully",
      transferId: result.insertId
    });

  } catch (error) {
    console.error("❌ Error creating stock transfer:", error);
    return NextResponse.json(
      { error: "Failed to create stock transfer: " + error.message },
      { status: 500 }
    );
  }
}