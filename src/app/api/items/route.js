import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    // Validate parameters
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid page parameter' },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Invalid limit parameter' },
        { status: 400 }
      );
    }

    // Fetch total number of records
    const totalRecordsResult = await executeQuery('SELECT COUNT(*) as total FROM items');
    const totalRecords = parseInt(totalRecordsResult[0].total);

    // Calculate total pages
    const totalPages = Math.ceil(totalRecords / limit);

    // Fetch items data for the current page
    // Use direct values instead of placeholders for LIMIT/OFFSET to avoid prepared statement issues
    const items = await executeQuery(
      `SELECT id, item_name, price, image_path FROM items ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`
    );

    return NextResponse.json({
      success: true,
      data: {
        items,
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
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Convert id to integer and validate
    const itemId = parseInt(id);
    if (isNaN(itemId) || itemId < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid Item ID' },
        { status: 400 }
      );
    }

    // First, check if item exists
    const existingItem = await executeQuery('SELECT id FROM items WHERE id = ?', [itemId]);
    
    if (existingItem.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    // Delete item from database
    const result = await executeQuery('DELETE FROM items WHERE id = ?', [itemId]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}