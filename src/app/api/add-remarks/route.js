import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const remarks_name = formData.get('remarks_name');
    const price = formData.get('price');
    const image = formData.get('image');

    if (!remarks_name || !price) {
      return NextResponse.json(
        { success: false, error: 'Remarks name and price are required' },
        { status: 400 }
      );
    }

    let image_path = '';

    if (image && image.size > 0) {
      // Handle file upload logic here
      image_path = image.name;
    }

    const result = await executeQuery(
      'INSERT INTO remarks (remarks_name, price, image_path) VALUES (?, ?, ?)',
      [remarks_name, price, image_path]
    );

    return NextResponse.json({
      success: true,
      message: 'New remark added successfully!',
      data: {
        id: result.insertId,
        remarks_name,
        price,
        image_path
      }
    });

  } catch (error) {
    console.error('Error adding remark:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}