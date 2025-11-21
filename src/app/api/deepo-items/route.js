import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    // Fetch total number of records
    const totalRecordsResult = await executeQuery('SELECT COUNT(*) as total FROM remarks');
    const totalRecords = totalRecordsResult[0].total;

    // Calculate total pages
    const totalPages = Math.ceil(totalRecords / limit);

    // Fetch remarks data for the current page - using template literal for LIMIT
    // This avoids the prepared statement issue with LIMIT
    const remarks = await executeQuery(
      `SELECT id, remarks_name, price, image_path FROM remarks ORDER BY id LIMIT ${limit} OFFSET ${offset}`
    );

    return NextResponse.json({
      success: true,
      data: {
        remarks,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords,
          limit,
          offset
        }
      }
    });

  } catch (error) {
    console.error('Error fetching remarks:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Remark ID is required' },
        { status: 400 }
      );
    }

    // Delete remark from database
    const result = await executeQuery('DELETE FROM remarks WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Remark not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Remark deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting remark:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}