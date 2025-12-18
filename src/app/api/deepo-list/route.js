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

      // Create Audit Log
      try {
        const currentUser = await getCurrentUser();
        const userId = currentUser?.userId || null;
        const userName = currentUser?.userName || 'System';

        await createAuditLog({
          page: 'Deepo',
          uniqueCode: deepo_history_id.toString(),
          section: 'Deepo Management',
          userId: userId,
          userName: userName,
          action: 'create',
          remarks: 'New Deepo entry created',
          oldValue: null,
          newValue: formData,
          recordType: 'deepo',
          recordId: deepo_history_id
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
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