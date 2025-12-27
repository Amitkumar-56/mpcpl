import { executeQuery } from '@/lib/db';
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { createAuditLog } from '@/lib/auditLog';

// GET - Fetch tanker data and related information
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tankerId = searchParams.get('id');

    if (!tankerId) {
      return NextResponse.json(
        { success: false, message: 'Tanker ID is required' },
        { status: 400 }
      );
    }

    // Fetch tanker history
    const tankerQuery = "SELECT * FROM tanker_history WHERE id = ?";
    const tankerResult = await executeQuery(tankerQuery, [parseInt(tankerId)]);

    if (tankerResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tanker record not found' },
        { status: 404 }
      );
    }

    const tankerData = tankerResult[0];

    // Fetch stations
    const stationsQuery = "SELECT id, station_name FROM filling_stations WHERE status = 1";
    const stations = await executeQuery(stationsQuery);

    // Fetch all items
    const itemsQuery = "SELECT id, item_name FROM items";
    const allItems = await executeQuery(itemsQuery);

    // Fetch tanker items for this vehicle
    let items = [];
    if (tankerData.licence_plate) {
      const itemsQuery = "SELECT * FROM tanker_items WHERE vehicle_no = ?";
      items = await executeQuery(itemsQuery, [tankerData.licence_plate]);
      
      // If no items found, create entries for all items
      if (items.length === 0 && allItems.length > 0) {
        for (const item of allItems) {
          const insertQuery = `
            INSERT INTO tanker_items (vehicle_no, item_id, item_name) 
            VALUES (?, ?, ?)
          `;
          await executeQuery(insertQuery, [
            tankerData.licence_plate,
            item.id,
            item.item_name
          ]);

          // Fetch the newly created item
          const newItemQuery = "SELECT * FROM tanker_items WHERE vehicle_no = ? AND item_id = ?";
          const newItem = await executeQuery(newItemQuery, [
            tankerData.licence_plate,
            item.id
          ]);
          
          if (newItem.length > 0) {
            items.push(newItem[0]);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tanker: tankerData,
        stations,
        allItems,
        items
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching tanker data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Update tanker data
export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const tankerId = parseInt(formData.get('tanker_id'));
    const closingMeter = formData.get('closing_meter');
    const dieselLtr = formData.get('diesel_ltr');
    const remarks = formData.get('remarks');
    const closingStation = formData.get('closing_station');
    const closingDate = formData.get('closing_date');
    
    // Handle file uploads
    const files = formData.getAll('files');
    let uploadedFiles = [];

    // Upload files if any
    for (const file of files) {
      if (file.size > 0) {
        const uploadPath = await handleFileUpload(file, tankerId);
        uploadedFiles.push(uploadPath);
      }
    }

    // Get existing PDF paths or use uploaded files
    const existingPdfPaths = formData.get('existing_pdf_paths') || '[]';
    const pdfPaths = uploadedFiles.length > 0 ? 
      JSON.stringify(uploadedFiles) : 
      existingPdfPaths;

    // Get old tanker data before update for audit log
    const oldTankerQuery = "SELECT * FROM tanker_history WHERE id = ?";
    const oldTankerResult = await executeQuery(oldTankerQuery, [tankerId]);
    const oldTanker = oldTankerResult.length > 0 ? oldTankerResult[0] : null;

    // Update tanker_history
    const updateTankerQuery = `
      UPDATE tanker_history 
      SET closing_meter = ?, diesel_ltr = ?, remarks = ?, 
          closing_station = ?, closing_date = ?, pdf_path = ? 
      WHERE id = ?
    `;

    await executeQuery(updateTankerQuery, [
      closingMeter ? parseFloat(closingMeter) : null,
      dieselLtr ? parseFloat(dieselLtr) : null,
      remarks,
      closingStation,
      closingDate,
      pdfPaths,
      tankerId
    ]);

    // Get updated tanker data
    const newTankerQuery = "SELECT * FROM tanker_history WHERE id = ?";
    const newTankerResult = await executeQuery(newTankerQuery, [tankerId]);
    const newTanker = newTankerResult.length > 0 ? newTankerResult[0] : null;

    // Get current user from token - ALWAYS fetch from employee_profile
    let userId = null;
    let userName = null;
    try {
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth');
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          const employeeResult = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (employeeResult.length > 0 && employeeResult[0].name) {
            userName = employeeResult[0].name;
          }
        }
      }
    } catch (authError) {
      console.error('Error getting user info:', authError);
    }

    // Create comprehensive audit log with oldValue and newValue
    try {
      await createAuditLog({
        page: 'Tanker Management',
        uniqueCode: `TANKER-${tankerId}`,
        section: 'Edit Tanker',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: `Tanker record updated: Licence ${oldTanker?.licence_plate || 'N/A'}`,
        oldValue: oldTanker,
        newValue: newTanker,
        recordType: 'tanker',
        recordId: parseInt(tankerId)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    // Update tanker items
    const licencePlate = formData.get('licence_plate');
    const allItemsCount = parseInt(formData.get('all_items_count'));

    if (allItemsCount > 0 && licencePlate) {
      for (let index = 0; index < allItemsCount; index++) {
        const itemId = formData.get(`item_id_${index}`);
        const pcs = formData.get(`pcs_${index}`) || 0;
        const desc = formData.get(`desc_${index}`) || '';
        const openingStatus = formData.get(`opening_status_${index}`) || '';
        const closingStatus = formData.get(`closing_status_${index}`) || '';
        const openingDriverSign = formData.get(`opening_driver_sign_${index}`) || '';
        const openingCheckerSign = formData.get(`opening_checker_sign_${index}`) || '';
        const closingDriverSign = formData.get(`closing_driver_sign_${index}`) || '';
        const closingCheckerSign = formData.get(`closing_checker_sign_${index}`) || '';

        // Check if item exists
        const checkQuery = "SELECT id FROM tanker_items WHERE vehicle_no = ? AND item_id = ?";
        const existingItem = await executeQuery(checkQuery, [licencePlate, itemId]);

        if (existingItem.length > 0) {
          // Update existing
          const updateQuery = `
            UPDATE tanker_items 
            SET pcs = ?, description = ?, opening_status = ?, opening_driver_sign = ?, 
                opening_checker_sign = ?, closing_status = ?, closing_driver_sign = ?, 
                closing_checker_sign = ? 
            WHERE vehicle_no = ? AND item_id = ?
          `;
          await executeQuery(updateQuery, [
            parseInt(pcs),
            desc,
            openingStatus,
            openingDriverSign,
            openingCheckerSign,
            closingStatus,
            closingDriverSign,
            closingCheckerSign,
            licencePlate,
            itemId
          ]);
        } else {
          // Insert new
          const itemName = formData.get(`item_name_${index}`);
          const insertQuery = `
            INSERT INTO tanker_items 
            (vehicle_no, item_id, item_name, pcs, description, opening_status, 
             opening_driver_sign, opening_checker_sign, closing_status, 
             closing_driver_sign, closing_checker_sign) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          await executeQuery(insertQuery, [
            licencePlate,
            itemId,
            itemName,
            parseInt(pcs),
            desc,
            openingStatus,
            openingDriverSign,
            openingCheckerSign,
            closingStatus,
            closingDriverSign,
            closingCheckerSign
          ]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tanker updated successfully!',
      data: { tankerId }
    });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating tanker',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to handle file upload
async function handleFileUpload(file, tankerId) {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', tankerId.toString());
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const originalName = file.name;
  const fileExtension = path.extname(originalName);
  const filename = `${timestamp}_${originalName}`;
  const filePath = path.join(uploadsDir, filename);

  // Convert file to buffer and save
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  fs.writeFileSync(filePath, buffer);

  return `/uploads/${tankerId}/${filename}`;
}