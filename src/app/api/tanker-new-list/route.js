import { executeQuery } from '@/lib/db';
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

    // Start transaction
    await executeQuery('START TRANSACTION');

    // Insert into tanker_history table
    const insertTankerQuery = `
      INSERT INTO tanker_history (
        licence_plate, first_driver, first_mobile, first_start_date, 
        opening_meter, closing_meter, diesel_ltr, remarks, 
        opening_station, closing_station, closing_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const tankerResult = await executeQuery(insertTankerQuery, [
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

    // Insert tanker_items only if not exists
    for (const itemData of items_data) {
      // Check if item already exists for this vehicle
      const checkQuery = "SELECT id FROM tanker_items WHERE vehicle_no = ? AND item_id = ?";
      const existingItems = await executeQuery(checkQuery, [
        licence_plate,
        itemData.item_id
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

        await executeQuery(insertItemQuery, [
          licence_plate,
          itemData.item_id,
          itemData.item_name,
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

    // Commit transaction
    await executeQuery('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Tanker created successfully!',
      data: { tanker_history_id }
    });

  } catch (error) {
    // Rollback transaction on error
    await executeQuery('ROLLBACK');
    
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