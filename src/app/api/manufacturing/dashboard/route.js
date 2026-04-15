// src/app/api/manufacturing/dashboard/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Stats queries
    const [rawMaterials] = await executeQuery("SELECT COUNT(*) as count FROM mfg_raw_materials WHERE status='active'").catch(() => [{ count: 0 }]);
    const [finishedGoods] = await executeQuery("SELECT COUNT(*) as count FROM mfg_finished_goods WHERE status='active'").catch(() => [{ count: 0 }]);
    const [totalBatches] = await executeQuery("SELECT COUNT(*) as count FROM mfg_batches").catch(() => [{ count: 0 }]);
    const [activeBatches] = await executeQuery("SELECT COUNT(*) as count FROM mfg_batches WHERE status IN ('draft','in_process','testing')").catch(() => [{ count: 0 }]);
    const [completedBatches] = await executeQuery("SELECT COUNT(*) as count FROM mfg_batches WHERE status='completed'").catch(() => [{ count: 0 }]);
    const [pendingTests] = await executeQuery("SELECT COUNT(*) as count FROM mfg_lab_tests WHERE result_status='pending'").catch(() => [{ count: 0 }]);
    const [tankerAllocations] = await executeQuery("SELECT COUNT(*) as count FROM mfg_tanker_allocation WHERE status IN ('allocated','in_transit','arrived')").catch(() => [{ count: 0 }]);
    const [gateEntries] = await executeQuery("SELECT COUNT(*) as count FROM security_gate_entries WHERE gate_status IN ('arrived','under_processing')").catch(() => [{ count: 0 }]);
    const [entryRequests] = await executeQuery("SELECT COUNT(*) as count FROM mfg_entry_requests WHERE status IN ('pending','approved','processing')").catch(() => [{ count: 0 }]);

    // Recent batches
    const recentBatches = await executeQuery(
      "SELECT id, batch_code, product_name, status, batch_date, actual_quantity, unit FROM mfg_batches ORDER BY created_at DESC LIMIT 10"
    ).catch(() => []);

    // Recent gate entries
    const recentGateEntries = await executeQuery(
      "SELECT id, entry_code, vehicle_number, driver_name, direction, gate_status, entry_time, exit_time FROM security_gate_entries ORDER BY created_at DESC LIMIT 10"
    ).catch(() => []);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          rawMaterials: rawMaterials?.count || 0,
          finishedGoods: finishedGoods?.count || 0,
          totalBatches: totalBatches?.count || 0,
          activeBatches: activeBatches?.count || 0,
          completedBatches: completedBatches?.count || 0,
          pendingTests: pendingTests?.count || 0,
          tankerAllocations: tankerAllocations?.count || 0,
          gateEntries: gateEntries?.count || 0,
          entryRequests: entryRequests?.count || 0,
        },
        recentBatches,
        recentGateEntries,
      }
    });
  } catch (error) {
    console.error("Manufacturing dashboard error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
