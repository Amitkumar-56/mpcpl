import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { ensureFarmingTables } from "@/lib/farming_init";


// ============ GET - Dashboard Stats ============
export async function GET(request) {
  try {

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'dashboard';

    if (view === 'dashboard') {

      // Sequential execution to prevent pool exhaustion
      const animalCounts = await executeQuery(`SELECT type, COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold, SUM(CASE WHEN status = 'deceased' THEN 1 ELSE 0 END) as deceased FROM farming_animals GROUP BY type`);
      const todayProduction = await executeQuery(`SELECT type, product_name, SUM(quantity) as total_qty, unit FROM farming_production WHERE production_date = CURDATE() GROUP BY type, product_name, unit`);
      const activeBatches = await executeQuery(`SELECT * FROM farming_batches WHERE status = 'active' ORDER BY created_at DESC LIMIT 5`);
      const recentInward = await executeQuery(`SELECT * FROM farming_inward ORDER BY created_at DESC LIMIT 5`);
      const recentOutward = await executeQuery(`SELECT * FROM farming_outward ORDER BY created_at DESC LIMIT 5`);
      const todayFeed = await executeQuery(`SELECT type, SUM(total_cost) as total_cost, SUM(quantity) as total_qty FROM farming_feed WHERE feed_date = CURDATE() GROUP BY type`);
      const monthlyExpenses = await executeQuery(`SELECT type, SUM(amount) as total FROM farming_expenses WHERE MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE()) GROUP BY type`);
      const salesRevenue = await executeQuery(`SELECT SUM(total_price) as total FROM farming_outward`);
      const feedExpense = await executeQuery(`SELECT SUM(total_cost) as total FROM farming_feed`);
      const healthExpense = await executeQuery(`SELECT SUM(cost) as total FROM farming_health`);
      const generalExpense = await executeQuery(`SELECT SUM(amount) as total FROM farming_expenses`);
      const purchaseExpense = await executeQuery(`SELECT SUM(purchase_price) as total FROM farming_animals`);
      const deathLoss = await executeQuery(`SELECT SUM(purchase_price) as total FROM farming_animals WHERE status = 'deceased'`);
      const recentProcessing = await executeQuery(`SELECT * FROM farming_processing ORDER BY created_at DESC LIMIT 5`);

      // NEW: Compliance & Missing Data Checks
      const missingHealth = await executeQuery(`
        SELECT tag_id, type 
        FROM farming_animals 
        WHERE status = 'active' 
        AND id NOT IN (SELECT animal_id FROM farming_health WHERE treatment_date >= DATE_SUB(CURDATE(), INTERVAL 15 DAY))
        LIMIT 5
      `);
      
      const missingWeight = await executeQuery(`
        SELECT tag_id, type 
        FROM farming_animals 
        WHERE status = 'active' 
        AND id NOT IN (SELECT animal_id FROM farming_growth WHERE recorded_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))
        LIMIT 5
      `);

      const missingFeed = await executeQuery(`
        SELECT batch_code, type 
        FROM farming_batches 
        WHERE status = 'active' 
        AND id NOT IN (SELECT batch_id FROM farming_feed WHERE feed_date = CURDATE())
        LIMIT 5
      `);

      const incompleteProfiles = await executeQuery(`
        SELECT tag_id, type 
        FROM farming_animals 
        WHERE status = 'active' 
        AND (date_of_birth IS NULL OR breed IS NULL OR weight IS NULL)
        LIMIT 5
      `);

      const financials = {
        totalRevenue: Number(salesRevenue[0]?.total || 0),
        totalFeedCost: Number(feedExpense[0]?.total || 0),
        totalHealthCost: Number(healthExpense[0]?.total || 0),
        totalGeneralExpense: Number(generalExpense[0]?.total || 0),
        totalPurchaseCost: Number(purchaseExpense[0]?.total || 0),
        totalDeathLoss: Number(deathLoss[0]?.total || 0),
      };
      financials.totalExpenses = financials.totalFeedCost + financials.totalHealthCost + financials.totalGeneralExpense + financials.totalPurchaseCost;
      financials.netProfit = financials.totalRevenue - financials.totalExpenses;

      return NextResponse.json({
        success: true,
        data: {
          animalCounts,
          todayProduction,
          activeBatches,
          recentInward,
          recentOutward,
          todayFeed,
          monthlyExpenses,
          financials,
          recentProcessing,
          compliance: {
            missingHealth,
            missingWeight,
            missingFeed,
            incompleteProfiles
          }
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Farming API ready' });
  } catch (error) {
    console.error("Farming API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
