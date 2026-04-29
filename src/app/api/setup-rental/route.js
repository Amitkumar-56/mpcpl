import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Rental Customers Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS rental_customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        phone VARCHAR(20),
        status TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // 2. Rental Trips Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS rental_trips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rental_customer_id INT NOT NULL,
        vehicle_id INT,
        vehicle_no VARCHAR(50),
        driver_name VARCHAR(255),
        driver_number VARCHAR(20),
        company_name VARCHAR(255),
        source VARCHAR(255),
        destination VARCHAR(255),
        state VARCHAR(100),
        voucher_no VARCHAR(100),
        status ENUM('Open', 'Closed') DEFAULT 'Open',
        total_expense DECIMAL(15, 2) DEFAULT 0.00,
        received_amount DECIMAL(15, 2) DEFAULT 0.00,
        profit_loss DECIMAL(15, 2) DEFAULT 0.00,
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (rental_customer_id) REFERENCES rental_customers(id) ON DELETE CASCADE
      );
    `);

    // 3. Rental Trip Expenses Table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS rental_trip_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_id INT NOT NULL,
        type ENUM('Fuel', 'DEF', 'Fastag', 'Others') NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id) REFERENCES rental_trips(id) ON DELETE CASCADE
      );
    `);

    return NextResponse.json({ success: true, message: 'Rental tables initialized' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
