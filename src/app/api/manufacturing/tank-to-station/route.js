import { executeQuery, executeTransaction } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/auditLog";

export async function GET() {
  try {
    // 1. Fetch available tank stocks with their active allocations (to know which product is in which tank)
    const tankStocksQuery = `
      SELECT 
        t.id as tank_id,
        t.name as tank_name,
        s.kg_stock,
        s.litre_stock,
        ta.material_id as product_id,
        fg.product_name as pname
      FROM manufacturing_tanks t
      JOIN manufacturing_tank_stocks s ON t.id = s.tank_id
      JOIN tank_allocation ta ON t.id = ta.tank_id
      LEFT JOIN finished_goods fg ON ta.material_id = fg.id
      WHERE ta.status = 'active' AND (s.kg_stock > 0 OR s.litre_stock > 0)
    `;

    // 2. Fetch filling stations
    const stationsQuery = `SELECT id, station_name FROM filling_stations ORDER BY station_name`;

    // 3. Fetch products with their codes for better identification
    const productsQuery = `
      SELECT 
        p.id, 
        p.pname,
        GROUP_CONCAT(pc.pcode) as codes
      FROM products p
      LEFT JOIN product_codes pc ON p.id = pc.product_id
      GROUP BY p.id, p.pname
      ORDER BY p.pname ASC
    `;

    // 4. Fetch recent history logs for this specific transfer type
    const recentTransfersQuery = `
      SELECT 
        h.id,
        h.created_at,
        h.kg_qty,
        h.litre_qty,
        t.name as tank_name,
        h.remarks
      FROM manufacturing_tank_stock_history h
      JOIN manufacturing_tanks t ON h.tank_id = t.id
      WHERE h.type = 'Deduction' AND h.remarks LIKE 'Transfer to Station%'
      ORDER BY h.created_at DESC
      LIMIT 10
    `;

    const [tankStocks, stations, products, recentTransfers] = await Promise.all([
      executeQuery(tankStocksQuery),
      executeQuery(stationsQuery),
      executeQuery(productsQuery),
      executeQuery(recentTransfersQuery)
    ]);

    return NextResponse.json({
      success: true,
      tankStocks,
      stations,
      products,
      recentTransfers
    });
  } catch (error) {
    console.error("Error fetching transfer data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      tank_id,
      station_id,
      product_id,
      quantity_kg,
      quantity_litre,
      remarks
    } = body;

    if (!tank_id || !station_id || !product_id || (!quantity_kg && !quantity_litre)) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    const userId = currentUser?.userId || null;
    const userName = currentUser?.userName || "System";

    const result = await executeTransaction(async (connection) => {
      // 1. Verify and deduct from manufacturing tank stock
      const [tankStock] = await connection.execute(
        "SELECT kg_stock, litre_stock FROM manufacturing_tank_stocks WHERE tank_id = ?",
        [tank_id]
      );

      if (tankStock.length === 0) throw new Error("Tank stock not found");

      const currentKg = parseFloat(tankStock[0].kg_stock) || 0;
      const currentLitre = parseFloat(tankStock[0].litre_stock) || 0;
      const qKg = parseFloat(quantity_kg) || 0;
      const qLitre = parseFloat(quantity_litre) || 0;

      if (currentKg < qKg || currentLitre < qLitre) {
        throw new Error("Insufficient stock in manufacturing tank");
      }

      await connection.execute(
        "UPDATE manufacturing_tank_stocks SET kg_stock = kg_stock - ?, litre_stock = litre_stock - ? WHERE tank_id = ?",
        [qKg, qLitre, tank_id]
      );

      // 2. Log in manufacturing tank stock history
      await connection.execute(
        `INSERT INTO manufacturing_tank_stock_history 
        (tank_id, type, kg_qty, litre_qty, kg_before, litre_before, kg_after, litre_after, remarks) 
        VALUES (?, 'Deduction', ?, ?, ?, ?, ?, ?, ?)`,
        [
          tank_id, qKg, qLitre, 
          currentKg, currentLitre, 
          currentKg - qKg, currentLitre - qLitre, 
          remarks || `Transfer to Station ID: ${station_id}`
        ]
      );

      // 3. Update or Insert into filling_station_stocks
      // Note: filling_station_stocks table often uses 'stock' as a single column (usually litres or kg depending on setup)
      // Based on previous files, it uses 'stock'. We'll use litres as the primary stock unit for filling stations, or check if we need both.
      // Most filling stations track litres.
      
      const [stationStock] = await connection.execute(
        "SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?",
        [station_id, product_id]
      );

      let oldStationStock = 0;
      if (stationStock.length > 0) {
        oldStationStock = parseFloat(stationStock[0].stock) || 0;
        await connection.execute(
          "UPDATE filling_station_stocks SET stock = stock + ?, msg = ?, remark = ? WHERE fs_id = ? AND product = ?",
          [qLitre || qKg, "Stock transfer from manufacturing", remarks || "", station_id, product_id]
        );
      } else {
        await connection.execute(
          "INSERT INTO filling_station_stocks (fs_id, product, stock, msg, remark, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
          [station_id, product_id, qLitre || qKg, "Initial stock from manufacturing", remarks || ""]
        );
      }

      // 4. Log in filling_history
      await connection.execute(
        `INSERT INTO filling_history 
        (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at) 
        VALUES (?, ?, 'Inward', ?, ?, ?, NOW(), ?, NOW())`,
        [
          station_id, product_id, 
          oldStationStock, 
          qLitre || qKg, 
          oldStationStock + (qLitre || qKg), 
          userId
        ]
      );

      // 5. Audit Log
      await createAuditLog({
        page: 'Tank to Station Transfer',
        uniqueCode: `T2S-${Date.now()}`,
        section: 'Manufacturing',
        userId: userId,
        userName: userName,
        action: 'create',
        remarks: `Transferred ${qLitre || qKg} from Tank ${tank_id} to Station ${station_id}`,
        recordType: 'tank_transfer',
        recordId: tank_id
      });

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing transfer:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process transfer: " + error.message },
      { status: 500 }
    );
  }
}
