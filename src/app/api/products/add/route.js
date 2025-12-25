import { executeQuery } from '@/lib/db';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req) {
  try {
    const { pname, pcodes } = await req.json();

    if (!pname || !Array.isArray(pcodes) || pcodes.length === 0) {
      return new Response(JSON.stringify({ message: 'Product name and codes are required' }), { status: 400 });
    }

    const result = await executeQuery('INSERT INTO products (pname) VALUES (?)', [pname]);
    const productId = result.insertId;

    for (const code of pcodes) {
      await executeQuery('INSERT INTO product_codes (product_id, pcode) VALUES (?, ?)', [productId, code]);
    }

    // Get current user for audit log
    let userId = null;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || null;
      userName = currentUser?.userName || null;
      
      if (!userName && userId) {
        const users = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ?`,
          [userId]
        );
        if (users.length > 0) {
          userName = users[0].name;
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    // Create audit log
    try {
      await createAuditLog({
        page: 'Products Management',
        uniqueCode: `PRODUCT-${productId}`,
        section: 'Add Product',
        userId: userId,
        userName: userName,
        action: 'create',
        remarks: `New product created: ${pname} with codes: ${pcodes.join(', ')}`,
        oldValue: null,
        newValue: { product_id: productId, pname, pcodes },
        recordType: 'product',
        recordId: productId
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return new Response(JSON.stringify({ message: 'Product added successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error inserting product:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), { status: 500 });
  }
}
