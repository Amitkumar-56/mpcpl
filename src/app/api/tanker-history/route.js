import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// GET - Fetch all tanker history records
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const approveId = searchParams.get('approve_id');

    // Handle approval if requested
    if (approveId) {
      return await handleApproval(approveId);
    }

    // Fetch all tankers with approved by name
    const sql = `
      SELECT th.*, ep.name AS approved_name
      FROM tanker_history th
      LEFT JOIN employee_profile ep ON th.approved_by = ep.id
      ORDER BY th.id DESC
    `;

    const results = await executeQuery(sql);

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error fetching tanker history',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// POST - Handle tanker approval
export async function POST(request) {
  try {
    const { id, action } = await request.json();

    if (action === 'approve') {
      return await handleApproval(id);
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error processing approval',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// Helper function to handle tanker approval
async function handleApproval(approveId) {
  try {
    // Fetch the tanker record
    const checkSql = "SELECT closing_station, closing_date, pdf_path FROM tanker_history WHERE id = ?";
    const tanker = await executeQuery(checkSql, [parseInt(approveId)]);

    if (tanker.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tanker not found!' },
        { status: 404 }
      );
    }

    const tankerData = tanker[0];
    const closingStationFilled = !!tankerData.closing_station;
    const closingDateFilled = !!tankerData.closing_date && tankerData.closing_date !== '0000-00-00';
    const pdfUploaded = !!tankerData.pdf_path && tankerData.pdf_path.trim() !== '';

    // Check if all required fields are filled - Relaxed validation
    // if (closingStationFilled && closingDateFilled && pdfUploaded) {
    if (true) {
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
            const employeeResult = await executeQuery(
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

      // If no user found, return error
      if (!userId) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized. Please login again.' },
          { status: 401 }
        );
      }

      // Update status to approved and save approver ID from token
      const updateSql = "UPDATE tanker_history SET status = 'approved', approved_by = ? WHERE id = ?";
      await executeQuery(updateSql, [userId, parseInt(approveId)]);

      // Create audit log entry for approval
      try {
        await executeQuery(`
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

        await executeQuery(
          `INSERT INTO tanker_audit_log (tanker_id, action_type, user_id, user_name, remarks) VALUES (?, ?, ?, ?, ?)`,
          [parseInt(approveId), 'approve', userId, employeeName, 'Tanker approved']
        );
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
        // Don't fail the main operation
      }

      return NextResponse.json({
        success: true,
        message: 'Tanker approved successfully'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot approve tanker! Please ensure Closing Date, Closing Station, and PDF/Image upload are completed.'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Approval processing error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error processing approval',
        error: error.message
      },
      { status: 500 }
    );
  }
}