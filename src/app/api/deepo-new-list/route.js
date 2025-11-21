import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let deepoData = {};
    let items = [];
    let stations = [];
    let previousDeepo = {};

    // Fetch stations
    stations = await executeQuery('SELECT id, station_name FROM filling_stations WHERE status=1');

    if (id) {
      // Fetch specific deepo record
      const deepoResult = await executeQuery('SELECT * FROM deepo_history WHERE id = ?', [id]);
      
      if (deepoResult.length > 0) {
        deepoData = deepoResult[0];
        
        // Fetch items for this deepo
        items = await executeQuery(
          'SELECT * FROM deepo_items WHERE vehicle_no = ?',
          [deepoData.licence_plate]
        );
      }
    }

    // Fetch previous deepo for auto-fill
    const previousResult = await executeQuery('SELECT * FROM deepo_history ORDER BY id DESC LIMIT 1');
    if (previousResult.length > 0) {
      previousDeepo = previousResult[0];
    }

    return NextResponse.json({
      success: true,
      data: {
        deepoData,
        items,
        stations,
        previousDeepo
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
      id,
      licence_plate,
      first_driver,
      first_mobile,
      first_start_date,
      closing_date,
      diesel_ltr,
      opening_station,
      closing_station,
      remarks,
      items
    } = formData;

    await executeQuery('START TRANSACTION');

    try {
      if (id) {
        // Update existing record
        await executeQuery(
          `UPDATE deepo_history SET 
            licence_plate = ?, first_driver = ?, first_mobile = ?, first_start_date = ?,
            closing_date = ?, diesel_ltr = ?, opening_station = ?, closing_station = ?, remarks = ?
          WHERE id = ?`,
          [
            licence_plate,
            first_driver,
            first_mobile,
            first_start_date,
            closing_date,
            diesel_ltr,
            opening_station,
            closing_station,
            remarks,
            id
          ]
        );
      } else {
        // Insert new record
        const result = await executeQuery(
          `INSERT INTO deepo_history (
            licence_plate, first_driver, first_mobile, first_start_date,
            closing_date, diesel_ltr, opening_station, closing_station, remarks, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            licence_plate,
            first_driver,
            first_mobile,
            first_start_date,
            closing_date,
            diesel_ltr,
            opening_station,
            closing_station,
            remarks
          ]
        );
      }

      // Process items
      for (const item of items) {
        const { item_id, item_name, pcs, description, opening_status, closing_status } = item;

        // Check if item exists
        const existingItem = await executeQuery(
          'SELECT id FROM deepo_items WHERE vehicle_no = ? AND item_id = ?',
          [licence_plate, item_id]
        );

        if (existingItem.length > 0) {
          // Update existing item
          await executeQuery(
            `UPDATE deepo_items SET 
              pcs = ?, description = ?, opening_status = ?, closing_status = ?
            WHERE id = ?`,
            [
              pcs,
              description,
              opening_status,
              closing_status,
              existingItem[0].id
            ]
          );
        } else {
          // Insert new item
          await executeQuery(
            `INSERT INTO deepo_items (
              vehicle_no, item_id, item_name, pcs, description, opening_status, closing_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              licence_plate,
              item_id,
              item_name,
              pcs,
              description,
              opening_status,
              closing_status
            ]
          );
        }
      }

      await executeQuery('COMMIT');

      return NextResponse.json({
        success: true,
        message: id ? 'Deepo details updated successfully' : 'Deepo details saved successfully',
        id: id || result.insertId
      });

    } catch (error) {
      await executeQuery('ROLLBACK');
      throw error;
    }

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}