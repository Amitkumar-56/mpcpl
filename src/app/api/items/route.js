import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    // Fetch total number of records
    const totalRecordsResult = await executeQuery('SELECT COUNT(*) as total FROM items');
    const totalRecords = totalRecordsResult[0].total;

    // Calculate total pages
    const totalPages = Math.ceil(totalRecords / limit);

    // Fetch items data for the current page
    const items = await executeQuery(
      'SELECT id, item_name, price, image_path FROM items LIMIT ? OFFSET ?',
      [limit, offset]
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
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // Delete item from database
    const result = await executeQuery('DELETE FROM items WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}