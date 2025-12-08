import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Deepo ID is required' },
        { status: 400 }
      );
    }

    // Fetch deepo data
    const deepoData = await executeQuery(
      'SELECT * FROM deepo_history WHERE id = ?',
      [id]
    );

    if (deepoData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deepo record not found' },
        { status: 404 }
      );
    }

    const deepo = deepoData[0];

    // Fetch deepo items
    let items = [];
    if (deepo.licence_plate) {
      items = await executeQuery(
        'SELECT * FROM deepo_items WHERE vehicle_no = ?',
        [deepo.licence_plate]
      );
    }

    // Decode pdf_path JSON
    let pdfFiles = [];
    if (deepo.pdf_path) {
      try {
        pdfFiles = JSON.parse(deepo.pdf_path);
        if (!Array.isArray(pdfFiles)) {
          pdfFiles = [];
        }
      } catch (error) {
        console.error('Error parsing PDF paths:', error);
        pdfFiles = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        deepo,
        items,
        pdfFiles
      }
    });

  } catch (error) {
    console.error('Error fetching deepo data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { id, action, remarks, userId = 1, userName = 'System' } = await request.json();

    if (!id || !action) {
      return NextResponse.json(
        { success: false, error: 'ID and action are required' },
        { status: 400 }
      );
    }

    let status;
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    if (action === 'approve') {
      status = 'approved';
    } else if (action === 'reject') {
      status = 'rejected';
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Check which columns exist in the table
    const columnsResult = await executeQuery('DESCRIBE deepo_history');
    const columnNames = columnsResult.map(col => col.Field);
    const hasApprovedAt = columnNames.includes('approved_at');
    const hasRejectedAt = columnNames.includes('rejected_at');
    const hasApprovalRemarks = columnNames.includes('approval_remarks');
    const hasApprovedBy = columnNames.includes('approved_by');

    // Build dynamic UPDATE query based on available columns
    let updateFields = ['status = ?'];
    let updateValues = [status];

    if (hasApprovedAt && action === 'approve') {
      updateFields.push('approved_at = ?');
      updateValues.push(timestamp);
    }
    if (hasRejectedAt && action === 'reject') {
      updateFields.push('rejected_at = ?');
      updateValues.push(timestamp);
    }
    if (hasApprovalRemarks) {
      updateFields.push('approval_remarks = ?');
      updateValues.push(remarks || '');
    }
    if (hasApprovedBy) {
      updateFields.push('approved_by = ?');
      updateValues.push(userId);
    }

    updateValues.push(id);

    const updateQuery = `UPDATE deepo_history SET ${updateFields.join(', ')} WHERE id = ?`;
    const result = await executeQuery(updateQuery, updateValues);

    // Create audit log entry
    try {
      // Check if audit log table exists, if not create it
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

      // Fetch employee name from employee_profile if user_id is provided
      let employeeName = userName || 'System';
      if (userId) {
        try {
          const employeeResult = await executeQuery(
            `SELECT name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (employeeResult.length > 0) {
            employeeName = employeeResult[0].name;
          }
        } catch (empError) {
          console.error('Error fetching employee name:', empError);
        }
      }
      
      // Use consistent action type (approve/rejected)
      const logActionType = action === 'approve' ? 'approve' : 'rejected';
      
      await executeQuery(
        `INSERT INTO deepo_audit_log (deepo_id, action_type, user_id, user_name, remarks) VALUES (?, ?, ?, ?, ?)`,
        [id, logActionType, userId, employeeName, remarks || `Deepo ${action}d`]
      );
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation if audit log fails
    }

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Deepo record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deepo ${action}ed successfully`,
      data: { id, status }
    });

  } catch (error) {
    console.error('Error updating deepo status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}