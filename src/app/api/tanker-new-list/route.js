import { executeQuery, executeTransaction } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch data for the form including previous tanker data
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tankerId = searchParams.get('id');

    let tankerData = {};
    let previousTanker = {};
    let items = [];
    let stations = [];

    // Fetch specific tanker data if ID provided
    if (tankerId) {
      const tankerQuery = "SELECT * FROM tanker_history WHERE id = ?";
      const tankerResult = await executeQuery(tankerQuery, [parseInt(tankerId)]);
      
      if (tankerResult.length > 0) {
        tankerData = tankerResult[0];
        
        // Fetch items for this tanker
        if (tankerData.licence_plate) {
          const itemsQuery = "SELECT * FROM tanker_items WHERE vehicle_no = ?";
          items = await executeQuery(itemsQuery, [tankerData.licence_plate]);
        }
      }
    }

    // Fetch the most recent tanker for auto-fill
    const previousQuery = "SELECT * FROM tanker_history ORDER BY id DESC LIMIT 1";
    const previousResult = await executeQuery(previousQuery);
    
    if (previousResult.length > 0) {
      previousTanker = previousResult[0];
    }

    // Fetch stations
    const stationsQuery = "SELECT id, station_name FROM filling_stations WHERE status = 1";
    stations = await executeQuery(stationsQuery);

    // Auto-fill values from previous tanker
    const autoFillData = {
      opening_station: previousTanker.closing_station || '',
      opening_meter: previousTanker.closing_meter || 0,
      first_start_date: previousTanker.closing_date || new Date().toISOString().split('T')[0],
      licence_plate: tankerData.licence_plate || previousTanker.licence_plate || ''
    };

    return NextResponse.json({
      success: true,
      data: {
        tankerData,
        previousTanker,
        items,
        stations,
        autoFillData
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
      closing_date,
      remarks,
      items_data
    } = formData;

    // Use executeTransaction helper to properly handle transactions
    const result = await executeTransaction(async (connection) => {
      // Insert into tanker_history table
      const insertTankerQuery = `
        INSERT INTO tanker_history (
          licence_plate, first_driver, first_mobile, first_start_date, 
          opening_meter, closing_meter, diesel_ltr, remarks, 
          opening_station, closing_station, closing_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const [tankerResult] = await connection.execute(insertTankerQuery, [
        licence_plate,
        first_driver,
        first_mobile,
        first_start_date,
        parseInt(opening_meter) || 0,
        parseInt(closing_meter) || 0,
        parseFloat(diesel_ltr) || 0,
        remarks,
        opening_station,
        closing_station,
        closing_date
      ]);

      const tanker_history_id = tankerResult.insertId;

      // Create audit log entry for creation
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS tanker_audit_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tanker_id INT NOT NULL,
            action_type VARCHAR(50) NOT NULL,
            user_id INT,
            user_name VARCHAR(255),
            remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_tanker_id (tanker_id),
            INDEX idx_created_at (created_at)
          )
        `);
        
        // Get current user from token - ALWAYS fetch from employee_profile
        let userId = null;
        let employeeName = null;
        try {
          const { cookies } = await import('next/headers');
          const { verifyToken } = await import('@/lib/auth');
          const cookieStore = await cookies();
          const token = cookieStore.get('token')?.value;
          if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
              userId = decoded.userId || decoded.id;
              const [employeeResult] = await connection.execute(
                `SELECT id, name FROM employee_profile WHERE id = ?`,
                [userId]
              );
              if (employeeResult.length > 0 && employeeResult[0].name) {
                employeeName = employeeResult[0].name;
              }
            }
          }
        } catch (authError) {
          console.error('Error getting user info:', authError);
        }
        
        // Only create audit log if we have valid user
        if (userId && employeeName) {
          await connection.execute(
            `INSERT INTO tanker_audit_log (tanker_id, action_type, user_id, user_name, remarks) VALUES (?, ?, ?, ?, ?)`,
            [tanker_history_id, 'created', userId, employeeName, 'Tanker record created']
          );
        }
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
        // Don't fail the main operation
      }

      // Insert tanker_items only if not exists
      if (items_data && Array.isArray(items_data)) {
        for (const itemData of items_data) {
          // Support both 'id' and 'item_id' fields
          const itemId = itemData.item_id || itemData.id;
          
          if (!itemId) {
            console.warn('Skipping item without item_id or id:', itemData);
            continue;
          }

          // Check if item already exists for this vehicle
          const checkQuery = "SELECT id FROM tanker_items WHERE vehicle_no = ? AND item_id = ?";
          const [existingItems] = await connection.execute(checkQuery, [
            licence_plate,
            itemId
          ]);

          if (existingItems.length === 0) {
            // Insert new item
            const insertItemQuery = `
              INSERT INTO tanker_items 
              (vehicle_no, item_id, item_name, pcs, description,
               opening_status, closing_status, opening_driver_sign,
               opening_checker_sign, closing_driver_sign, closing_checker_sign)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await connection.execute(insertItemQuery, [
              licence_plate,
              itemId,
              itemData.item_name || '',
              parseInt(itemData.pcs) || 0,
              itemData.description || '',
              itemData.opening_status || '',
              itemData.closing_status || '',
              itemData.opening_driver_sign || '',
              itemData.opening_checker_sign || '',
              itemData.closing_driver_sign || '',
              itemData.closing_checker_sign || ''
            ]);
          }
        }
      }

      return { tanker_history_id };
    });

    return NextResponse.json({
      success: true,
      message: 'Tanker created successfully!',
      data: result
    });

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