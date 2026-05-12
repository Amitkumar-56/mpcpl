import { executeQuery } from "./db";

let tablesEnsured = false;

export async function ensureFarmingTables() {
  if (tablesEnsured) return;

  try {
    // 1. Animals Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_animals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tag_id VARCHAR(50) UNIQUE NOT NULL,
        barcode VARCHAR(100) UNIQUE,
        name VARCHAR(100),
        type VARCHAR(50) NOT NULL,
        breed VARCHAR(100),
        gender ENUM('male', 'female', 'unknown') DEFAULT 'unknown',
        date_of_birth DATE,
        weight DECIMAL(10, 2),
        color VARCHAR(50),
        mother_id INT,
        father_id INT,
        batch_id INT,
        purchase_price DECIMAL(15, 2) DEFAULT 0,
        source VARCHAR(200),
        health_status ENUM('healthy', 'sick', 'under_treatment', 'recovered') DEFAULT 'healthy',
        status ENUM('active', 'sold', 'deceased', 'transferred') DEFAULT 'active',
        notes TEXT,
        photo_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2. Batches Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        batch_name VARCHAR(100) NOT NULL,
        total_count INT DEFAULT 0,
        start_date DATE,
        end_date DATE,
        status ENUM('active', 'closed', 'planned') DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Inward Register
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_inward (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        animal_id INT,
        batch_id INT,
        inward_type ENUM('purchase', 'birth', 'transfer_in', 'return', 'gift') DEFAULT 'purchase',
        quantity INT DEFAULT 1,
        weight DECIMAL(10, 2),
        unit_price DECIMAL(15, 2) DEFAULT 0,
        total_price DECIMAL(15, 2) DEFAULT 0,
        supplier_name VARCHAR(200),
        supplier_contact VARCHAR(20),
        vehicle_no VARCHAR(50),
        invoice_no VARCHAR(100),
        inward_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Outward Register
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_outward (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        animal_id INT,
        batch_id INT,
        outward_type ENUM('sale', 'death', 'slaughter', 'transfer_out') DEFAULT 'sale',
        product_type VARCHAR(100),
        quantity INT DEFAULT 1,
        weight DECIMAL(10, 2),
        unit_price DECIMAL(15, 2) DEFAULT 0,
        total_price DECIMAL(15, 2) DEFAULT 0,
        buyer_name VARCHAR(200),
        buyer_contact VARCHAR(20),
        vehicle_no VARCHAR(50),
        invoice_no VARCHAR(100),
        outward_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Production Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_production (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        animal_id INT,
        batch_id INT,
        product_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(20) DEFAULT 'kg',
        quality_grade VARCHAR(50),
        production_date DATE,
        shift ENUM('morning', 'evening', 'full_day') DEFAULT 'full_day',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Feed Register
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_feed (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        animal_id INT,
        batch_id INT,
        feed_name VARCHAR(100) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(20) DEFAULT 'kg',
        total_cost DECIMAL(15, 2) DEFAULT 0,
        feed_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Health Records
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_health (
        id INT AUTO_INCREMENT PRIMARY KEY,
        animal_id INT NOT NULL,
        type VARCHAR(50),
        doctor_id INT,
        treatment_type VARCHAR(100),
        disease_name VARCHAR(100),
        medicine_name VARCHAR(200),
        dosage VARCHAR(100),
        cost DECIMAL(15, 2) DEFAULT 0,
        treatment_date DATE,
        next_followup DATE,
        symptoms TEXT,
        temperature DECIMAL(5, 2),
        blood_report TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Growth Tracking
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_growth (
        id INT AUTO_INCREMENT PRIMARY KEY,
        animal_id INT NOT NULL,
        weight DECIMAL(10, 2),
        height DECIMAL(10, 2),
        recorded_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Doctors/Vets
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_doctors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        specialization VARCHAR(100),
        contact_no VARCHAR(20),
        address TEXT,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Processing Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_processing (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        source_product VARCHAR(100) NOT NULL,
        source_quantity DECIMAL(10, 2) DEFAULT 0,
        source_unit VARCHAR(20) DEFAULT 'litre',
        derivative_product VARCHAR(100) NOT NULL,
        derivative_quantity DECIMAL(10, 2) DEFAULT 0,
        derivative_unit VARCHAR(20) DEFAULT 'kg',
        processing_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. General Farming Expenses
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        expense_type VARCHAR(100) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        expense_date DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Feed Inventory (Bags/Stock)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS farming_feed_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tag_id VARCHAR(50) UNIQUE NOT NULL,
        barcode VARCHAR(100) UNIQUE,
        feed_name VARCHAR(100) NOT NULL,
        feed_type ENUM('starter', 'grower', 'finisher', 'supplement', 'other') DEFAULT 'other',
        total_quantity DECIMAL(10, 2) NOT NULL,
        remaining_quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(20) DEFAULT 'kg',
        unit_price DECIMAL(15, 2) DEFAULT 0,
        total_cost DECIMAL(15, 2) DEFAULT 0,
        supplier VARCHAR(200),
        arrival_date DATE,
        expiry_date DATE,
        status ENUM('active', 'empty', 'expired') DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    tablesEnsured = true;
    console.log("Farming tables initialized successfully.");
  } catch (error) {
    console.error("Farming Table Initialization Error:", error);
    // Don't rethrow if it's just a connection error, but log it
  }
}
