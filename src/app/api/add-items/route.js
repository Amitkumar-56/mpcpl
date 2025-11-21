// src/app/api/add-items/route.js (Enhanced with file upload)
import { executeQuery } from '@/lib/db';
import { writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const item_name = formData.get('item_name');
    const price = formData.get('price');
    const image = formData.get('image');

    // Validate required fields
    if (!item_name || !price) {
      return NextResponse.json(
        { success: false, error: 'Item name and price are required' },
        { status: 400 }
      );
    }

    let image_path = '';

    // Handle image upload
    if (image && image.size > 0) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(image.type)) {
        return NextResponse.json(
          { success: false, error: 'Invalid file type. Only JPG, PNG, and GIF are allowed.' },
          { status: 400 }
        );
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024;
      if (image.size > maxSize) {
        return NextResponse.json(
          { success: false, error: 'File size too large. Maximum size is 5MB.' },
          { status: 400 }
        );
      }

      // Generate unique filename
      const fileExtension = path.extname(image.name);
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
      image_path = `/uploads/${fileName}`;

      // Convert image to buffer
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save file to public/uploads directory
      const uploadPath = path.join(process.cwd(), 'public', 'uploads', fileName);
      await writeFile(uploadPath, buffer);
    }

    // Insert into database
    const result = await executeQuery(
      'INSERT INTO items (item_name, price, image_path) VALUES (?, ?, ?)',
      [item_name, price, image_path]
    );

    return NextResponse.json({
      success: true,
      message: 'New item added successfully!',
      data: {
        id: result.insertId,
        item_name,
        price,
        image_path
      }
    });

  } catch (error) {
    console.error('Error adding item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}