import { executeQuery, executeTransaction } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch dropdown data
export async function GET() {
  try {
    // Fetch employees
    const employeesQuery = "SELECT name, phone FROM employee_profile";
    const employees = await executeQuery(employeesQuery);

    // Fetch vehicles
    const vehiclesQuery = "SELECT id, licence_plate FROM vehicles";
    const vehicles = await executeQuery(vehiclesQuery);

    // Fetch filling stations
    const stationsQuery = "SELECT id, station_name FROM filling_stations WHERE status = 1";
    const stations = await executeQuery(stationsQuery);

    // Fetch items
    const itemsQuery = "SELECT id, item_name FROM items";
    const items = await executeQuery(itemsQuery);

    // Fetch tanker_items table structure
    const columnsQuery = "DESCRIBE tanker_items";
    const columnsResult = await executeQuery(columnsQuery);
    const columns = columnsResult.map(row => row.Field);

    return NextResponse.json({
      success: true,
      data: {
        employees,
        vehicles,
        stations,
        items,
        columns
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Create new tanker record
export async function POST(request) {
  try {
    const formData = await request.json();
    
    const {
      licence_plate,
      first_driver,
      first_mobile,
      first_start_date,
      opening_meter,
      closing_meter,
      diesel_ltr,
      opening_station,
      closing_station,
      remarks,
      items_data
    } = formData;

    // Use transaction helper
    const result = await executeTransaction(async (connection) => {
      // Insert into tanker_history table
      const insertTankerQuery = `
        INSERT INTO tanker_history (
          licence_plate, first_driver, first_mobile, first_start_date, 
          opening_meter, closing_meter, diesel_ltr, remarks, opening_station, closing_station, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const [tankerResult] = await connection.execute(insertTankerQuery, [
        licence_plate,
        first_driver,
        first_mobile,
        first_start_date,
        parseInt(opening_meter),
        parseInt(closing_meter),
        parseFloat(diesel_ltr),
        remarks,
        opening_station,
        closing_station
      ]);

      const tanker_history_id = tankerResult.insertId;

      // Create Audit Log
      try {
        const currentUser = await getCurrentUser();
        const userId = currentUser?.userId || null;
        // Ensure userName is fetched from employee_profile
        let userName = currentUser?.userName;
        if (!userName && currentUser?.userId) {
          const users = await executeQuery(
            `SELECT name FROM employee_profile WHERE id = ?`,
            [currentUser.userId]
          );
          if (users.length > 0 && users[0].name) {
            userName = users[0].name;
          }
        }

        await createAuditLog({
          page: 'Tanker',
          uniqueCode: tanker_history_id.toString(),
          section: 'Tanker Management',
          userId: userId,
          userName: userName,
          action: 'create',
          remarks: 'New Tanker entry created',
          oldValue: null,
          newValue: formData,
          recordType: 'tanker',
          recordId: tanker_history_id
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      // Fetch tanker_items table columns
      const [columnsResult] = await connection.execute("DESCRIBE tanker_items");
      const columns = columnsResult.map(row => row.Field);

      // Build dynamic insert query for tanker_items
      // Check if tanker_history_id column exists
      const hasTankerHistoryId = columns.includes('tanker_history_id');
      
      const column_list = hasTankerHistoryId ? ['tanker_history_id', 'vehicle_no', 'item_id', 'item_name'] : ['vehicle_no', 'item_id', 'item_name'];
      const placeholders = hasTankerHistoryId ? ['?', '?', '?', '?'] : ['?', '?', '?'];

      const additional_columns = {
        'pcs': 'i',
        'description': 's',
        'opening_status': 's',
        'closing_status': 's',
        'opening_driver_sign': 's',
        'opening_checker_sign': 's',
        'closing_driver_sign': 's',
        'closing_checker_sign': 's'
      };

      for (const [column, type] of Object.entries(additional_columns)) {
        if (columns.includes(column)) {
          column_list.push(column);
          placeholders.push('?');
        }
      }

      const insertItemQuery = `
        INSERT INTO tanker_items (${column_list.join(', ')}) 
        VALUES (${placeholders.join(', ')})
      `;

      // Insert items data
      for (const itemData of items_data) {
        const param_values = hasTankerHistoryId 
          ? [
              tanker_history_id,
              licence_plate,
              itemData.item_id || itemData.id,
              itemData.item_name || itemData.remarks_name
            ]
          : [
              licence_plate,
              itemData.item_id || itemData.id,
              itemData.item_name || itemData.remarks_name
            ];

        if (columns.includes('pcs')) {
          param_values.push(parseInt(itemData.pcs) || 0);
        }

        if (columns.includes('description')) {
          param_values.push(itemData.description || '');
        }

        if (columns.includes('opening_status')) {
          param_values.push(itemData.opening_status || '');
        }

        if (columns.includes('closing_status')) {
          param_values.push(itemData.closing_status || '');
        }

        if (columns.includes('opening_driver_sign')) {
          param_values.push(itemData.opening_driver_sign || '');
        }

        if (columns.includes('opening_checker_sign')) {
          param_values.push(itemData.opening_checker_sign || '');
        }

        if (columns.includes('closing_driver_sign')) {
          param_values.push(itemData.closing_driver_sign || '');
        }

        if (columns.includes('closing_checker_sign')) {
          param_values.push(itemData.closing_checker_sign || '');
        }

        await connection.execute(insertItemQuery, param_values);
      }

      return {
        success: true,
        message: 'Tanker created successfully!',
        data: { tanker_history_id }
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    
    console.error('Create tanker error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error creating tanker',
        error: error.message 
      },
      { status: 500 }
    );
  }
}