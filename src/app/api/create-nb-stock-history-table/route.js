// src/app/api/create-nb-stock-history-table/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🚀 Creating nb_stock_history table...');

    // Create the table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS nb_stock_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        station_name VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        request_id INT,
        completion_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_customer_name (customer_name),
        INDEX idx_station_name (station_name),
        INDEX idx_completion_date (completion_date),
        INDEX idx_request_id (request_id)
      )
    `;

    await executeQuery(createTableSQL);
    console.log('✅ Table created successfully');

    // Add foreign key constraint (optional, may fail if no matching table)
    try {
      const addForeignKeySQL = `
        ALTER TABLE nb_stock_history 
        ADD CONSTRAINT fk_nb_stock_history_request 
        FOREIGN KEY (request_id) REFERENCES filling_requests(id) 
        ON DELETE SET NULL
      `;
      await executeQuery(addForeignKeySQL);
      console.log('✅ Foreign key constraint added');
    } catch (fkError) {
      console.log('⚠️ Foreign key constraint skipped (filling_requests table may not exist):', fkError.message);
    }

    // Verify table exists
    const verifySQL = 'DESCRIBE nb_stock_history';
    const result = await executeQuery(verifySQL);
    
    console.log('✅ Table verification successful!');
    console.log('Table structure:', result.map(row => `${row.Field} (${row.Type})`));

    return NextResponse.json({
      success: true,
      message: 'nb_stock_history table created successfully!',
      tableStructure: result.map(row => ({ field: row.Field, type: row.Type }))
    });

  } catch (error) {
    console.error('❌ Error creating table:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
