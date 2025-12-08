import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET - Fetch deepo data and related information
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const deepoId = searchParams.get('id');

    if (!deepoId) {
      return NextResponse.json(
        { success: false, message: 'Deepo ID is required' },
        { status: 400 }
      );
    }

    // Fetch deepo history
    const deepoQuery = "SELECT * FROM deepo_history WHERE id = ?";
    const deepoResult = await executeQuery(deepoQuery, [parseInt(deepoId)]);

    if (deepoResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Deepo record not found' },
        { status: 404 }
      );
    }

    const deepoData = deepoResult[0];

    // Fetch stations
    const stationsQuery = "SELECT id, station_name FROM filling_stations WHERE status = 1";
    const stations = await executeQuery(stationsQuery);

    // Fetch remarks
    const remarksQuery = "SELECT id, remarks_name FROM remarks";
    const remarksResult = await executeQuery(remarksQuery);
    const remarksList = {};
    remarksResult.forEach(row => {
      remarksList[row.id] = row.remarks_name;
    });

    // Fetch deepo items
    let items = [];
    if (deepoData.licence_plate) {
      const itemsQuery = "SELECT * FROM deepo_items WHERE vehicle_no = ?";
      items = await executeQuery(itemsQuery, [deepoData.licence_plate]);
    }

    // Get table structure
    const tableStructureQuery = "DESCRIBE deepo_items";
    const tableStructureResult = await executeQuery(tableStructureQuery);
    const tableStructure = {};
    tableStructureResult.forEach(row => {
      tableStructure[row.Field] = row;
    });

    return NextResponse.json({
      success: true,
      data: {
        deepo: deepoData,
        stations,
        remarksList,
        items,
        tableStructure
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching deepo data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Update deepo data
export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const deepoId = parseInt(formData.get('deepo_id'));
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
        const uploadPath = await handleFileUpload(file, deepoId);
        uploadedFiles.push(uploadPath);
      }
    }

    // Get existing PDF paths and merge with new ones
    const existingPdfPaths = formData.get('existing_pdf_paths') || '[]';
    const existingPaths = JSON.parse(existingPdfPaths);
    const allPaths = [...existingPaths, ...uploadedFiles];

    // Update deepo_history
    const updateDeepoQuery = `
      UPDATE deepo_history 
      SET diesel_ltr = ?, remarks = ?, closing_station = ?, closing_date = ?, pdf_path = ? 
      WHERE id = ?
    `;

    await executeQuery(updateDeepoQuery, [
      dieselLtr ? parseFloat(dieselLtr) : null,
      remarks,
      closingStation,
      closingDate,
      JSON.stringify(allPaths),
      deepoId
    ]);

    // Create audit log entry for edit
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS deepo_audit_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          deepo_id INT NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          user_id INT,
          user_name VARCHAR(255),
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_deepo_id (deepo_id),
          INDEX idx_created_at (created_at)
        )
      `);
      
      // Fetch employee name from employee_profile
      let employeeName = 'System';
      try {
        const employeeResult = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ?`,
          [1]
        );
        if (employeeResult.length > 0) {
          employeeName = employeeResult[0].name;
        }
      } catch (empError) {
        console.error('Error fetching employee name:', empError);
      }
      
      await executeQuery(
        `INSERT INTO deepo_audit_log (deepo_id, action_type, user_id, user_name, remarks) VALUES (?, ?, ?, ?, ?)`,
        [deepoId, 'edited', 1, employeeName, 'Deepo record updated']
      );
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    // Process items
    const licencePlate = formData.get('licence_plate');
    const itemIds = formData.getAll('item_id[]');
    
    for (let i = 0; i < itemIds.length; i++) {
      const itemValue = itemIds[i];
      const pcs = formData.get(`pcs_${i}`) || 0;
      const desc = formData.get(`desc_${i}`) || '';
      const openingStatus = formData.get(`opening_status_${i}`) || '';
      const closingStatus = formData.get(`closing_status_${i}`) || '';

      const isExistingItem = !isNaN(itemValue) && parseInt(itemValue) > 0;

      if (isExistingItem) {
        // Update existing item
        const updateItemQuery = `
          UPDATE deepo_items 
          SET pcs = ?, description = ?, opening_status = ?, closing_status = ? 
          WHERE id = ? AND vehicle_no = ?
        `;
        await executeQuery(updateItemQuery, [
          parseInt(pcs),
          desc,
          openingStatus,
          closingStatus,
          parseInt(itemValue),
          licencePlate
        ]);
      } else {
        // Insert new item from remarks
        const itemName = itemValue;

        // Check if item_id is auto-increment
        const isAutoIncrement = tableStructure.item_id && 
                              tableStructure.item_id.Extra.includes('auto_increment');

        if (isAutoIncrement) {
          const insertQuery = `
            INSERT INTO deepo_items 
            (vehicle_no, item_name, pcs, description, opening_status, closing_status) 
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          await executeQuery(insertQuery, [
            licencePlate,
            itemName,
            parseInt(pcs),
            desc,
            openingStatus,
            closingStatus
          ]);
        } else {
          // Get max item_id and increment
          const maxIdQuery = "SELECT MAX(item_id) as max_id FROM deepo_items";
          const maxIdResult = await executeQuery(maxIdQuery);
          const newItemId = (maxIdResult[0]?.max_id || 0) + 1;

          const insertQuery = `
            INSERT INTO deepo_items 
            (item_id, vehicle_no, item_name, pcs, description, opening_status, closing_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          await executeQuery(insertQuery, [
            newItemId,
            licencePlate,
            itemName,
            parseInt(pcs),
            desc,
            openingStatus,
            closingStatus
          ]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Deepo updated successfully!',
      data: { deepoId }
    });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error updating deepo',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to handle file upload
async function handleFileUpload(file, deepoId) {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'deepos', deepoId.toString());
  
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

  return `/uploads/deepos/${deepoId}/${filename}`;
}