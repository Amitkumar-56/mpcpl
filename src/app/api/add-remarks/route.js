// src/app/api/add-remarks/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

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
        page: 'Remarks Management',
        uniqueCode: `REMARK-${result.insertId}`,
        section: 'Create Remark',
        userId: userId,
        userName: userName || (userId ? `Employee ID: ${userId}` : null),
        action: 'add',
        remarks: `Remark created: ${remarks_name}, Price: ₹${price}`,
        oldValue: null,
        newValue: {
          id: result.insertId,
          remarks_name,
          price,
          image_path
        },
        recordType: 'remark',
        recordId: result.insertId
      });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
    }

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