// Example: How to use the Universal Audit Log System
// This file shows examples - you can delete this file after understanding the usage

import { createAuditLog } from './auditLog';
import { cookies } from 'next/headers';
import { verifyToken } from './auth';
import { executeQuery } from './db';

/**
 * Example 1: Basic usage in an API route
 */
export async function exampleBasicUsage(request) {
  // Get user info
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  let userId = null;
  let userName = 'System';
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      userId = decoded.userId || decoded.id;
      const users = await executeQuery(
        `SELECT id, name FROM employee_profile WHERE id = ?`,
        [userId]
      );
      if (users.length > 0) {
        userName = users[0].name;
      }
    }
  }
  
  // Create audit log
  await createAuditLog({
    page: 'Customer Management',
    uniqueCode: `CUST-${customerId}`,
    section: 'Edit Customer',
    userId: userId,
    userName: userName,
    action: 'edit',
    remarks: 'Customer details updated',
    oldValue: { name: 'Old Name', email: 'old@email.com' },
    newValue: { name: 'New Name', email: 'new@email.com' },
    fieldName: 'name',
    recordType: 'customer',
    recordId: customerId
  });
}

/**
 * Example 2: For CREATE action
 */
export async function exampleCreateAction(request) {
  // ... get user info ...
  
  await createAuditLog({
    page: 'Stock Management',
    uniqueCode: `STOCK-${newStockId}`,
    section: 'Add Stock',
    userId: userId,
    userName: userName,
    action: 'create',
    remarks: 'New stock record created',
    oldValue: null,
    newValue: { quantity: 100, station_id: 1, product_id: 2 },
    recordType: 'stock',
    recordId: newStockId
  });
}

/**
 * Example 3: For DELETE action
 */
export async function exampleDeleteAction(request) {
  // ... get user info ...
  
  await createAuditLog({
    page: 'Supplier Management',
    uniqueCode: `SUPPLIER-${supplierId}`,
    section: 'Delete Supplier',
    userId: userId,
    userName: userName,
    action: 'delete',
    remarks: 'Supplier deleted',
    oldValue: { name: 'Supplier Name', status: 'active' },
    newValue: null,
    recordType: 'supplier',
    recordId: supplierId
  });
}

/**
 * Example 4: For single field change
 */
export async function exampleFieldChange(request) {
  // ... get user info ...
  
  await createAuditLog({
    page: 'Customer Management',
    uniqueCode: `CUST-${customerId}`,
    section: 'Update Status',
    userId: userId,
    userName: userName,
    action: 'edit',
    remarks: 'Customer status changed',
    oldValue: 'inactive',
    newValue: 'active',
    fieldName: 'status',
    recordType: 'customer',
    recordId: customerId
  });
}

/**
 * Example 5: For APPROVE/REJECT actions
 */
export async function exampleApproveReject(request) {
  // ... get user info ...
  
  await createAuditLog({
    page: 'Tanker Management',
    uniqueCode: `TANKER-${tankerId}`,
    section: 'Approve Tanker',
    userId: userId,
    userName: userName,
    action: 'approve', // or 'reject'
    remarks: 'Tanker request approved',
    oldValue: { status: 'pending' },
    newValue: { status: 'approved' },
    fieldName: 'status',
    recordType: 'tanker',
    recordId: tankerId
  });
}

