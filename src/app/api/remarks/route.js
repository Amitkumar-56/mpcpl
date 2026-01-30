import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Get single remark by ID
      const remarks = await executeQuery(
        'SELECT * FROM remarks WHERE id = ?',
        [id]
      );
      
      if (remarks.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Remark not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: remarks[0]
      });
    } else {
      // Get all remarks
      const remarks = await executeQuery('SELECT id, remarks_name FROM remarks');
      
      return NextResponse.json({
        success: true,
        data: remarks
      });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Remark ID is required' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const remarks_name = formData.get('remarks_name');
    const price = formData.get('price');
    const image = formData.get('image');
    const updated_by = formData.get('updated_by');
    const updated_by_id = formData.get('updated_by_id');
    const updated_by_role = formData.get('updated_by_role');

    if (!remarks_name) {
      return NextResponse.json(
        { success: false, error: 'Remark name is required' },
        { status: 400 }
      );
    }

    let imageUrl = null;
    
    // Handle image upload
    if (image && image !== 'null') {
      // In a real implementation, you would upload the file to a storage service
      // For now, we'll simulate the upload
      const timestamp = Date.now();
      const filename = `remark_${id}_${timestamp}.${image.name.split('.').pop()}`;
      imageUrl = `/uploads/${filename}`;
      
      // TODO: Actually save the file to filesystem or cloud storage
      console.log('Image would be saved as:', imageUrl);
    }

    // Update remark in database
    await executeQuery(
      `UPDATE remarks SET 
       remarks_name = ?, 
       price = ?, 
       image = COALESCE(?, image),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [remarks_name.trim(), price || null, imageUrl, id]
    );

    // Create audit log
    await executeQuery(
      `INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, created_by, created_by_id, created_by_role, created_at)
       SELECT 'remarks', id, 'edit', 
              JSON_OBJECT('remarks_name', remarks_name, 'price', price, 'image', image),
              JSON_OBJECT('remarks_name', ?, 'price', ?, 'image', COALESCE(?, image)),
              ?, ?, ?, CURRENT_TIMESTAMP
       FROM remarks WHERE id = ?`,
      [remarks_name.trim(), price || null, imageUrl, updated_by, updated_by_id, updated_by_role, id]
    );

    return NextResponse.json({
      success: true,
      message: 'Remark updated successfully',
      data: {
        remarks_name: remarks_name.trim(),
        price: price || null,
        image: imageUrl,
        updated_by: updated_by
      }
    });
  } catch (error) {
    console.error('PUT /api/remarks error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}