import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.json();

    // Extract all fields from the form data
    const {
      tanker,
      driver,
      dispatch,
      driver_mobile,
      empty_weight_loading,
      loaded_weight_loading,
      net_weight_loading,
      final_loading_datetime,
      entered_by_loading,
      seal1_loading,
      seal2_loading,
      seal_datetime_loading,
      sealed_by_loading,
      density_loading,
      temperature_loading,
      timing_loading,
      consignee,
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
      timing_unloading
    } = formData;

    // Insert query
    const query = `
      INSERT INTO shipment_records 
      (tanker, driver, dispatch, driver_mobile, 
      empty_weight_loading, loaded_weight_loading, net_weight_loading, 
      final_loading_datetime, entered_by_loading, seal1_loading, seal2_loading, 
      seal_datetime_loading, sealed_by_loading, density_loading, temperature_loading, timing_loading, 
      consignee, empty_weight_unloading, loaded_weight_unloading, net_weight_unloading, 
      final_unloading_datetime, entered_by_unloading, seal1_unloading, seal2_unloading, 
      seal_datetime_unloading, sealed_by_unloading, density_unloading, temperature_unloading, timing_unloading, 
      created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      tanker, driver, dispatch, driver_mobile,
      empty_weight_loading, loaded_weight_loading, net_weight_loading,
      final_loading_datetime, entered_by_loading, seal1_loading, seal2_loading,
      seal_datetime_loading, sealed_by_loading, density_loading, temperature_loading, timing_loading,
      consignee, empty_weight_unloading, loaded_weight_unloading, net_weight_unloading,
      final_unloading_datetime, entered_by_unloading, seal1_unloading, seal2_unloading,
      seal_datetime_unloading, sealed_by_unloading, density_unloading, temperature_unloading, timing_unloading
    ];

    const result = await executeQuery(query, values);

    return NextResponse.json({
      success: true,
      message: '✅ Shipment record saved successfully',
      id: result.insertId
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '❌ Error saving shipment record',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Fetch employees for dropdown
    const employeesQuery = "SELECT name, phone FROM employee_profile";
    const employees = await executeQuery(employeesQuery);

    // Fetch vehicles for dropdown
    const vehiclesQuery = "SELECT id, licence_plate FROM vehicles";
    const vehicles = await executeQuery(vehiclesQuery);

    return NextResponse.json({
      success: true,
      data: {
        employees,
        vehicles
      }
    });

  } catch (error) {
    console.error('Error fetching dropdown data:', error);
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