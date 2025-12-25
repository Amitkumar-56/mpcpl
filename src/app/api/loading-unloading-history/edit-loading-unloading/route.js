import { executeQuery } from '@/lib/db';
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipment_id');

    if (!shipmentId) {
      return NextResponse.json(
        { success: false, message: 'Shipment ID is required' },
        { status: 400 }
      );
    }

    // Fetch shipment record
    const query = "SELECT * FROM shipment_records WHERE shipment_id = ?";
    const results = await executeQuery(query, [parseInt(shipmentId)]);

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Shipment not found' },
        { status: 404 }
      );
    }

    const shipment = results[0];

    return NextResponse.json({
      success: true,
      data: shipment
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching shipment data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const shipment_id = parseInt(formData.get('shipment_id'));
    const tanker = formData.get('tanker') || '';
    const driver = formData.get('driver') || '';
    const dispatch = formData.get('dispatch') || '';
    const driver_mobile = formData.get('driver_mobile') || '';
    const empty_weight_loading = formData.get('empty_weight_loading') || null;
    const loaded_weight_loading = formData.get('loaded_weight_loading') || null;
    const net_weight_loading = formData.get('net_weight_loading') || null;
    const final_loading_datetime = formData.get('final_loading_datetime') || null;
    const entered_by_loading = formData.get('entered_by_loading') || '';
    const seal1_loading = formData.get('seal1_loading') || '';
    const seal2_loading = formData.get('seal2_loading') || '';
    const seal_datetime_loading = formData.get('seal_datetime_loading') || null;
    const sealed_by_loading = formData.get('sealed_by_loading') || '';
    const density_loading = formData.get('density_loading') || '';
    const temperature_loading = formData.get('temperature_loading') || '';
    const timing_loading = formData.get('timing_loading') || '';
    const consignee = formData.get('consignee') || '';
    const empty_weight_unloading = formData.get('empty_weight_unloading') || null;
    const loaded_weight_unloading = formData.get('loaded_weight_unloading') || null;
    const net_weight_unloading = formData.get('net_weight_unloading') || null;
    const final_unloading_datetime = formData.get('final_unloading_datetime') || null;
    const entered_by_unloading = formData.get('entered_by_unloading') || '';
    const seal1_unloading = formData.get('seal1_unloading') || '';
    const seal2_unloading = formData.get('seal2_unloading') || '';
    const seal_datetime_unloading = formData.get('seal_datetime_unloading') || null;
    const sealed_by_unloading = formData.get('sealed_by_unloading') || '';
    const density_unloading = formData.get('density_unloading') || '';
    const temperature_unloading = formData.get('temperature_unloading') || '';
    const timing_unloading = formData.get('timing_unloading') || '';

    // Handle file upload
    const pdf_file = formData.get('pdf_file');
    let pdf_path = formData.get('current_pdf_path') || '';

    if (pdf_file && pdf_file.size > 0) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const timestamp = Date.now();
      const originalName = pdf_file.name;
      const fileExtension = path.extname(originalName);
      const filename = `${timestamp}_${originalName}`;
      const filePath = path.join(uploadsDir, filename);

      // Convert file to buffer and save
      const bytes = await pdf_file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(filePath, buffer);

      pdf_path = `/uploads/${filename}`;

      // Delete old file if exists
      const currentPdfPath = formData.get('current_pdf_path');
      if (currentPdfPath) {
        const oldFilePath = path.join(process.cwd(), 'public', currentPdfPath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    // Update query
    const updateQuery = `
      UPDATE shipment_records SET 
        tanker=?, driver=?, dispatch=?, driver_mobile=?,
        empty_weight_loading=?, loaded_weight_loading=?, net_weight_loading=?,
        final_loading_datetime=?, entered_by_loading=?,
        seal1_loading=?, seal2_loading=?, seal_datetime_loading=?, sealed_by_loading=?,
        density_loading=?, temperature_loading=?, timing_loading=?,
        consignee=?,
        empty_weight_unloading=?, loaded_weight_unloading=?, net_weight_unloading=?,
        final_unloading_datetime=?, entered_by_unloading=?,
        seal1_unloading=?, seal2_unloading=?, seal_datetime_unloading=?, sealed_by_unloading=?,
        density_unloading=?, temperature_unloading=?, timing_unloading=?, 
        pdf_path=?
      WHERE shipment_id=?
    `;

    const values = [
      tanker, driver, dispatch, driver_mobile,
      empty_weight_loading, loaded_weight_loading, net_weight_loading,
      final_loading_datetime, entered_by_loading,
      seal1_loading, seal2_loading, seal_datetime_loading, sealed_by_loading,
      density_loading, temperature_loading, timing_loading,
      consignee,
      empty_weight_unloading, loaded_weight_unloading, net_weight_unloading,
      final_unloading_datetime, entered_by_unloading,
      seal1_unloading, seal2_unloading, seal_datetime_unloading, sealed_by_unloading,
      density_unloading, temperature_unloading, timing_unloading,
      pdf_path,
      shipment_id
    ];

    // Get old values for audit log
    const oldShipment = await executeQuery(
      `SELECT * FROM shipment_records WHERE shipment_id = ?`,
      [shipment_id]
    );
    const oldValues = oldShipment.length > 0 ? oldShipment[0] : null;

    const result = await executeQuery(updateQuery, values);

    if (result.affectedRows > 0) {
      // Get current user for audit log
      let userId = null;
      let userName = null;
      try {
        const currentUser = await getCurrentUser();
        userId = currentUser?.userId || null;
        userName = currentUser?.userName || null;
        
        if (!userName && userId) {
          const users = await executeQuery(
            `SELECT name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0) {
            userName = users[0].name;
          }
        }
      } catch (userError) {
        console.error('Error getting user info:', userError);
      }

      // Create audit log
      try {
        await createAuditLog({
          page: 'Loading History',
          uniqueCode: shipment_id.toString(),
          section: 'Edit Loading/Unloading',
          userId: userId,
          userName: userName,
          action: 'edit',
          remarks: `Shipment record updated: Tanker ${tanker}, Driver ${driver}`,
          oldValue: oldValues,
          newValue: {
            shipment_id,
            tanker,
            driver,
            dispatch,
            driver_mobile,
            consignee,
            pdf_path
          },
          recordType: 'loading_unloading',
          recordId: shipment_id
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Shipment updated successfully',
        data: { shipment_id }
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'No rows affected' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating shipment',
        error: error.message 
      },
      { status: 500 }
    );
  }
}