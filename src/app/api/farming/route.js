// src/app/api/farming/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// ============ DATABASE SETUP ============
async function ensureFarmingTables() {
  // 1. Animal Categories Master
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS farming_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Animals Master
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS farming_animals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tag_id VARCHAR(100) UNIQUE NOT NULL,
      barcode VARCHAR(200),
      name VARCHAR(150),
      category_id INT,
      type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
      breed VARCHAR(150),
      gender ENUM('male','female','unknown') DEFAULT 'unknown',
      date_of_birth DATE,
      weight DECIMAL(10,2),
      color VARCHAR(100),
      mother_id INT,
      father_id INT,
      batch_id INT,
      purchase_price DECIMAL(15,2) DEFAULT 0,
      source VARCHAR(200),
      health_status ENUM('healthy','sick','treatment','quarantine','deceased') DEFAULT 'healthy',
      status ENUM('active','sold','deceased','transferred') DEFAULT 'active',
      photo_url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (mother_id) REFERENCES farming_animals(id) ON DELETE SET NULL,
      FOREIGN KEY (father_id) REFERENCES farming_animals(id) ON DELETE SET NULL
    )
  `);

  // 3. Batches
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS farming_batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_code VARCHAR(100) UNIQUE NOT NULL,
      type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
      batch_name VARCHAR(200),
      total_count INT DEFAULT 0,
      start_date DATE,
      status ENUM('active','completed','cancelled') DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // 4. Inward (Animals/Stock coming IN)
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS farming_inward (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
      animal_id INT,
      batch_id INT,
      inward_type ENUM('purchase','birth','transfer_in','return','gift') NOT NULL,
      quantity INT DEFAULT 1,
      weight DECIMAL(10,2),
      unit_price DECIMAL(15,2) DEFAULT 0,
      total_price DECIMAL(15,2) DEFAULT 0,
      supplier_name VARCHAR(200),
      supplier_contact VARCHAR(100),
      vehicle_no VARCHAR(100),
      invoice_no VARCHAR(100),
      inward_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Outward (Animals/Products going OUT)
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS farming_outward (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
      animal_id INT,
      batch_id INT,
      outward_type ENUM('sale','death','transfer_out','slaughter','gift') NOT NULL,
      product_type VARCHAR(150),
      quantity INT DEFAULT 1,
      weight DECIMAL(10,2),
      unit_price DECIMAL(15,2) DEFAULT 0,
      total_price DECIMAL(15,2) DEFAULT 0,
      buyer_name VARCHAR(200),
      buyer_contact VARCHAR(100),
      vehicle_no VARCHAR(100),
      invoice_no VARCHAR(100),
      outward_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. Daily Production (Milk, Eggs, Honey, Dung, Meat, Fish etc.)
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS farming_production (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
      animal_id INT,
      batch_id INT,
      product_name VARCHAR(150) NOT NULL,
      quantity DECIMAL(15,2) DEFAULT 0,
      unit VARCHAR(50) DEFAULT 'kg',
      quality_grade VARCHAR(50),
      production_date DATE,
      shift ENUM('morning','evening','full_day') DEFAULT 'full_day',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Feed / Fodder Management
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS farming_feed (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
      animal_id INT,
      batch_id INT,
      feed_name VARCHAR(200) NOT NULL,
      quantity DECIMAL(15,2) DEFAULT 0,
      unit VARCHAR(50) DEFAULT 'kg',
      cost_per_unit DECIMAL(15,2) DEFAULT 0,
      total_cost DECIMAL(15,2) DEFAULT 0,
      feed_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Health / Medical Records
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS farming_health (
      id INT AUTO_INCREMENT PRIMARY KEY,
      animal_id INT,
      type ENUM('cow','goat','chicken','fish','honey') NOT NULL,
      treatment_type ENUM('vaccination','medication','checkup','surgery','deworming','other') NOT NULL,
      disease_name VARCHAR(200),
      medicine_name VARCHAR(200),
      dosage VARCHAR(100),
      doctor_name VARCHAR(200),
      cost DECIMAL(15,2) DEFAULT 0,
      treatment_date DATE,
      next_followup DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. Expenses
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS farming_expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('cow','goat','chicken','fish','honey','general') NOT NULL,
      category VARCHAR(150),
      description TEXT,
      amount DECIMAL(15,2) DEFAULT 0,
      vendor_name VARCHAR(200),
      bill_no VARCHAR(100),
      expense_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// ============ GET - Dashboard Stats ============
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'dashboard';

    if (view === 'dashboard') {
      // Parallelize all dashboard queries for high performance
      const [
        animalCounts,
        todayProduction,
        activeBatches,
        recentInward,
        recentOutward,
        todayFeed,
        monthlyExpenses,
        salesRevenue,
        feedExpense,
        healthExpense,
        generalExpense,
        purchaseExpense,
        deathLoss
      ] = await Promise.all([
        executeQuery(`SELECT type, COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold, SUM(CASE WHEN status = 'deceased' THEN 1 ELSE 0 END) as deceased FROM farming_animals GROUP BY type`),
        executeQuery(`SELECT type, product_name, SUM(quantity) as total_qty, unit FROM farming_production WHERE production_date = CURDATE() GROUP BY type, product_name, unit`),
        executeQuery(`SELECT type, COUNT(*) as count, SUM(total_count) as total_animals FROM farming_batches WHERE status = 'active' GROUP BY type`),
        executeQuery(`SELECT * FROM farming_inward ORDER BY created_at DESC LIMIT 5`),
        executeQuery(`SELECT * FROM farming_outward ORDER BY created_at DESC LIMIT 5`),
        executeQuery(`SELECT type, SUM(total_cost) as total_cost, SUM(quantity) as total_qty FROM farming_feed WHERE feed_date = CURDATE() GROUP BY type`),
        executeQuery(`SELECT type, SUM(amount) as total FROM farming_expenses WHERE MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE()) GROUP BY type`),
        executeQuery(`SELECT SUM(total_price) as total FROM farming_outward`),
        executeQuery(`SELECT SUM(total_cost) as total FROM farming_feed`),
        executeQuery(`SELECT SUM(cost) as total FROM farming_health`),
        executeQuery(`SELECT SUM(amount) as total FROM farming_expenses`),
        executeQuery(`SELECT SUM(purchase_price) as total FROM farming_animals`),
        executeQuery(`SELECT SUM(purchase_price) as total FROM farming_animals WHERE status = 'deceased'`)
      ]);

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
          financials
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Farming API ready' });
  } catch (error) {
    console.error("Farming API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
