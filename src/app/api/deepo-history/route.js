import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch all deepo history records
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const approveId = searchParams.get('approve_id');

    // Handle approval if requested
    if (approveId) {
      return await handleApproval(approveId);
    }

    // Fetch all deepos with approved by name
    const sql = `
      SELECT th.*, ep.name AS approved_name
      FROM deepo_history th
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
        message: 'Error fetching deepo history',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST - Handle deepo approval
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

// Helper function to handle deepo approval
async function handleApproval(approveId) {
  try {
    // Fetch the deepo record
    const checkSql = "SELECT closing_station, closing_date, pdf_path FROM deepo_history WHERE id = ?";
    const deepo = await executeQuery(checkSql, [parseInt(approveId)]);

    if (deepo.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Deepo not found!' },
        { status: 404 }
      );
    }

    const deepoData = deepo[0];
    const closingStationFilled = !!deepoData.closing_station;
    const closingDateFilled = !!deepoData.closing_date && deepoData.closing_date !== '0000-00-00';
    const pdfUploaded = !!deepoData.pdf_path && deepoData.pdf_path.trim() !== '';

    // Check if all required fields are filled
    if (closingStationFilled && closingDateFilled && pdfUploaded) {
      // Update status to approved and save approver ID
      const updateSql = "UPDATE deepo_history SET status = 'approved', approved_by = ? WHERE id = ?";
      await executeQuery(updateSql, [1, parseInt(approveId)]); // Using 1 as default approver ID

      return NextResponse.json({
        success: true,
        message: 'Deepo approved successfully'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Cannot approve deepo! Please ensure Closing Date, Closing Station, and PDF/Image upload are completed.' 
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