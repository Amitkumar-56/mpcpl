// src/app/api/add-items/route.js (Enhanced with file upload)
import { executeQuery } from '@/lib/db';
import { writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

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

    // Get current user for audit log
    let userId = null;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || currentUser?.id || null;
      const empResult = await executeQuery(
        `SELECT name FROM employee_profile WHERE id = ?`,
        [userId]
      );
      if (empResult.length > 0 && empResult[0].name) {
        userName = empResult[0].name;
      }
    } catch (authError) {
      console.warn('Auth check failed:', authError.message);
    }

    // Create audit log
    try {
      await createAuditLog({
        page: 'Items Management',
        uniqueCode: `ITEM-${result.insertId}`,
        section: 'Create Item',
        userId: userId,
        userName: userName || (userId ? `Employee ID: ${userId}` : null),
        action: 'add',
        remarks: `Item created: ${item_name}, Price: ₹${price}`,
        oldValue: null,
        newValue: {
          id: result.insertId,
          item_name,
          price,
          image_path
        },
        recordType: 'item',
        recordId: result.insertId
      });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
    }

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