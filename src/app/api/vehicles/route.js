import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleNo = searchParams.get("vehicle_no");
    const page = parseInt(searchParams.get("page")) || 1;
    const recordsPerPage = 10;
    const offset = (page - 1) * recordsPerPage;

    // If vehicle_no is provided, return single vehicle (same structure as vehicles list)
    if (vehicleNo) {
      const trimmedVehicleNo = vehicleNo.trim();
      console.log("🔍 Fetching vehicle by number:", trimmedVehicleNo);
      
      const vehicles = await executeQuery(`
        SELECT 
          v.id, 
          v.com_id, 
          v.vehicle_name, 
          v.licence_plate, 
          v.phone, 
          v.status, 
          v.driver_id,
          e.name as driver_name
        FROM vehicles v
        LEFT JOIN employee_profile e ON v.driver_id = e.id
        WHERE TRIM(UPPER(v.licence_plate)) = TRIM(UPPER(?))
      `, [trimmedVehicleNo]);

      if (vehicles.length === 0) {
        return NextResponse.json(
          { 
            vehicles: [],
            error: "Vehicle not found",
            vehicle_no: trimmedVehicleNo
          },
          { status: 404 }
        );
      }

      return NextResponse.json({ 
        vehicles: vehicles,
        totalPages: 1,
        currentPage: 1,
        totalCount: 1
      });
    }

    // Total records
    const totalRes = await executeQuery(`SELECT COUNT(*) as total FROM vehicles`);
    const totalRecords = totalRes && totalRes[0] ? parseInt(totalRes[0].total) : 0;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);

    // Vehicles with driver info - fetch all fields from vehicles table and driver name from employee_profile
    const vehicles = await executeQuery(`
      SELECT 
        v.id, 
        v.com_id, 
        v.vehicle_name, 
        v.licence_plate, 
        v.phone, 
        v.status, 
        v.driver_id,
        e.name as driver_name
      FROM vehicles v
      LEFT JOIN employee_profile e ON v.driver_id = e.id
      ORDER BY v.id DESC
      LIMIT ${recordsPerPage} OFFSET ${offset}
    `);

    return NextResponse.json({ 
      vehicles: vehicles || [], 
      totalPages, 
      currentPage: page,
      totalCount: totalRecords
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { 
        error: "Failed to fetch vehicles", 
        details: error.message || 'Database connection error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { vehicle_no, com_id, vehicle_name, licence_plate, phone, status, driver_id } = body;

    if (!vehicle_no) {
      return NextResponse.json(
        { error: "Vehicle number is required" },
        { status: 400 }
      );
    }

    // Check if vehicle exists
    const checkQuery = `SELECT * FROM vehicles WHERE licence_plate = ?`;
    const existingVehicle = await executeQuery(checkQuery, [vehicle_no]);

    if (existingVehicle.length === 0) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];

    if (com_id !== undefined) {
      updateFields.push('com_id = ?');
      updateParams.push(com_id);
    }
    if (vehicle_name !== undefined) {
      updateFields.push('vehicle_name = ?');
      updateParams.push(vehicle_name);
    }
    if (licence_plate !== undefined) {
      updateFields.push('licence_plate = ?');
      updateParams.push(licence_plate);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateParams.push(phone);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }
    if (driver_id !== undefined) {
      updateFields.push('driver_id = ?');
      updateParams.push(driver_id || null);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updateParams.push(vehicle_no);
    const updateQuery = `UPDATE vehicles SET ${updateFields.join(', ')} WHERE licence_plate = ?`;

    // Get updated vehicle data
    const newVehicle = await executeQuery(checkQuery, [vehicle_no]);

    await executeQuery(updateQuery, updateParams);

    // Get current user for audit log
    let userId = null;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || currentUser?.id || null;
      const empResult = await executeQuery(
        `SELECT name FROM employee_profile WHERE id = ?`,
        [userId]
      );
      if (empResult.length > 0 && empResult[0].name) {
        userName = empResult[0].name;
      }
    } catch (authError) {
      console.warn('Auth check failed:', authError.message);
    }

    // Create audit log
    try {
      await createAuditLog({
        page: 'Vehicles',
        uniqueCode: `VEHICLE-${existingVehicle[0].id}`,
        section: 'Edit Vehicle',
        userId: userId,
        userName: userName || (userId ? `Employee ID: ${userId}` : null),
        action: 'edit',
        remarks: `Vehicle updated: ${vehicle_no || licence_plate || existingVehicle[0].licence_plate}`,
        oldValue: existingVehicle[0],
        newValue: newVehicle.length > 0 ? newVehicle[0] : null,
        recordType: 'vehicle',
        recordId: existingVehicle[0].id
      });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Vehicle updated successfully"
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { 
        error: "Failed to update vehicle", 
        details: error.message || 'Database connection error'
      },
      { status: 500 }
    );
  }
}
