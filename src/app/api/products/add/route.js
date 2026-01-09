import { executeQuery } from '@/lib/db';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';
import { createEntityLog } from '@/lib/entityLogs';

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

    // ✅ Create entity-specific log (similar to filling_logs)
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      await createEntityLog({
        entityType: 'product',
        entityId: productId,
        createdBy: userId,
        createdDate: currentDateTime
      });
    } catch (logError) {
      console.error('⚠️ Error creating product log:', logError);
    }

    return new Response(JSON.stringify({ message: 'Product added successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error inserting product:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error', error: error.message }), { status: 500 });
  }
}
