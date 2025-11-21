import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch shipment record by ID
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      );
    }

    const query = "SELECT * FROM shipment_records WHERE id = ?";
    const results = await executeQuery(query, [parseInt(id)]);

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: results[0]
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching record',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Create or Update shipment record
export async function POST(request) {
  try {
    const formData = await request.json();
    const {
      id,
      tanker_number,
      driver_name,
      dispatch_from,
      driver_mobile,
      empty_weight_loading,
      loaded_weight,
      net_weight,
      final_loading_datetime,
      entered_by_loading,
      seal1_loading,
      seal2_loading,
      seal_datetime_loading,
      sealed_by_loading,
      density_loading,
      temperature_loading,
      timing_loading,
      customer_name,
      empty_weight_unloading,
      loaded_weight_unloading,
      net_weight_unloading,
      final_unloading_datetime,
      entered_by_unloading,
      seal1_unloading,
      seal2_unloading,
      seal_datetime_unloading,
      sealed_by_unloading,
      density_unloading,
      temperature_unloading,
      timing_unloading,
      notes
    } = formData;

    if (id && id > 0) {
      // Update existing record
      const updateQuery = `
        UPDATE shipment_records SET
          tanker_number=?, driver_name=?, dispatch_from=?, driver_mobile=?,
          empty_weight_loading=?, loaded_weight=?, net_weight=?,
          final_loading_datetime=?, entered_by_loading=?,
          seal1_loading=?, seal2_loading=?, seal_datetime_loading=?, sealed_by_loading=?,
          density_loading=?, temperature_loading=?, timing_loading=?,
          customer_name=?, empty_weight_unloading=?, loaded_weight_unloading=?, net_weight_unloading=?,
          final_unloading_datetime=?, entered_by_unloading=?,
          seal1_unloading=?, seal2_unloading=?, seal_datetime_unloading=?, sealed_by_unloading=?,
          density_unloading=?, temperature_unloading=?, timing_unloading=?, notes=?
        WHERE id=?
      `;

      const values = [
        tanker_number, driver_name, dispatch_from, driver_mobile,
        empty_weight_loading, loaded_weight, net_weight,
        final_loading_datetime, entered_by_loading,
        seal1_loading, seal2_loading, seal_datetime_loading, sealed_by_loading,
        density_loading, temperature_loading, timing_loading,
        customer_name, empty_weight_unloading, loaded_weight_unloading, net_weight_unloading,
        final_unloading_datetime, entered_by_unloading,
        seal1_unloading, seal2_unloading, seal_datetime_unloading, sealed_by_unloading,
        density_unloading, temperature_unloading, timing_unloading, notes,
        id
      ];

      const result = await executeQuery(updateQuery, values);

      if (result.affectedRows > 0) {
        return NextResponse.json({
          success: true,
          message: 'Record updated successfully',
          id: id
        });
      } else {
        return NextResponse.json(
          { success: false, message: 'No record found to update' },
          { status: 404 }
        );
      }
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO shipment_records (
          tanker_number, driver_name, dispatch_from, driver_mobile,
          empty_weight_loading, loaded_weight, net_weight,
          final_loading_datetime, entered_by_loading,
          seal1_loading, seal2_loading, seal_datetime_loading, sealed_by_loading,
          density_loading, temperature_loading, timing_loading,
          customer_name, empty_weight_unloading, loaded_weight_unloading, net_weight_unloading,
          final_unloading_datetime, entered_by_unloading,
          seal1_unloading, seal2_unloading, seal_datetime_unloading, sealed_by_unloading,
          density_unloading, temperature_unloading, timing_unloading, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        tanker_number, driver_name, dispatch_from, driver_mobile,
        empty_weight_loading, loaded_weight, net_weight,
        final_loading_datetime, entered_by_loading,
        seal1_loading, seal2_loading, seal_datetime_loading, sealed_by_loading,
        density_loading, temperature_loading, timing_loading,
        customer_name, empty_weight_unloading, loaded_weight_unloading, net_weight_unloading,
        final_unloading_datetime, entered_by_unloading,
        seal1_unloading, seal2_unloading, seal_datetime_unloading, sealed_by_unloading,
        density_unloading, temperature_unloading, timing_unloading, notes
      ];

      const result = await executeQuery(insertQuery, values);

      return NextResponse.json({
        success: true,
        message: 'Record created successfully',
        id: result.insertId
      });
    }

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error saving record',
        error: error.message 
      },
      { status: 500 }
    );
  }
}