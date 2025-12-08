import { executeQuery, executeTransaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch all data needed for the form
    const [items, employees, vehicles, stations] = await Promise.all([
      // Fetch items
      executeQuery('SELECT id, remarks_name FROM remarks'),
      
      // Fetch employees
      executeQuery('SELECT name, phone FROM employee_profile'),
      
      // Fetch vehicles
      executeQuery('SELECT id, licence_plate FROM vehicles'),
      
      // Fetch stations
      executeQuery('SELECT id, station_name FROM filling_stations WHERE status = 1')
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        employees,
        vehicles,
        stations
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.json();
    
    const {
      licence_plate,
      first_driver,
      first_mobile,
      first_start_date,
      diesel_ltr,
      opening_station,
      closing_station,
      remarks,
      items
    } = formData;

    // Use transaction helper
    const result = await executeTransaction(async (connection) => {
      // Insert into deepo_history table
      const [historyResult] = await connection.execute(
        `INSERT INTO deepo_history (
          licence_plate, first_driver, first_mobile, first_start_date, 
          diesel_ltr, remarks, created_at, opening_station, closing_station
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [
          licence_plate,
          first_driver,
          first_mobile,
          first_start_date,
          diesel_ltr,
          remarks,
          opening_station,
          closing_station
        ]
      );

      const deepo_history_id = historyResult.insertId;

      // Create audit log entry for creation
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS deepo_audit_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            deepo_id INT NOT NULL,
            action_type VARCHAR(50) NOT NULL,
            user_id INT,
            user_name VARCHAR(255),
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_deepo_id (deepo_id),
            INDEX idx_created_at (created_at)
          )
        `);
        
        // Fetch employee name from employee_profile
        let employeeName = 'System';
        try {
          const [employeeResult] = await connection.execute(
            `SELECT name FROM employee_profile WHERE id = ?`,
            [1]
          );
          if (employeeResult.length > 0) {
            employeeName = employeeResult[0].name;
          }
        } catch (empError) {
          console.error('Error fetching employee name:', empError);
        }
        
        await connection.execute(
          `INSERT INTO deepo_audit_log (deepo_id, action_type, user_id, user_name, remarks) VALUES (?, ?, ?, ?, ?)`,
          [deepo_history_id, 'created', 1, employeeName, 'Deepo record created']
        );
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
        // Don't fail the main operation
      }

      // Check if deepo_items table has deepo_history_id column (do this once outside loop)
      const [tableColumns] = await connection.execute(`DESCRIBE deepo_items`);
      const columnNames = tableColumns.map(col => col.Field);
      const hasDeepoHistoryId = columnNames.includes('deepo_history_id');

      // Insert items into deepo_items
      for (const item of items) {
        const { item_id, item_name, pcs, description, opening_status, closing_status } = item;
        
        if (hasDeepoHistoryId) {
          // Use deepo_history_id if column exists
          await connection.execute(
            `INSERT INTO deepo_items (
              deepo_history_id, vehicle_no, item_id, item_name, pcs, description, opening_status, closing_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              deepo_history_id,
              licence_plate,
              item_id,
              item_name,
              pcs || 0,
              description || '',
              opening_status || '',
              closing_status || ''
            ]
          );
        } else {
          // Fallback to vehicle_no only
          await connection.execute(
            `INSERT INTO deepo_items (
              vehicle_no, item_id, item_name, pcs, description, opening_status, closing_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              licence_plate,
              item_id,
              item_name,
              pcs || 0,
              description || '',
              opening_status || '',
              closing_status || ''
            ]
          );
        }
      }

      return {
        success: true,
        message: 'Deepo details saved successfully',
        id: deepo_history_id
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}