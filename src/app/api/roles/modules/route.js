// src/app/api/roles/modules/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch all available modules
export async function GET() {
  try {
    // Get distinct module names from role_permissions
    const modules = await executeQuery(`
      SELECT DISTINCT module_name 
      FROM role_permissions 
      WHERE module_name IS NOT NULL AND module_name != ''
      ORDER BY module_name
    `);

    // Also get modules from employee add/edit pages
    const allModules = [
      'Dashboard',
      'Customers',
      'Filling Requests',
      'Stock',
      'Loading Station',
      'Schedule Prices',
      'Products',
      'Employees',
      'Suppliers',
      'Transporters',
      'NB Accounts',
      'NB Expenses',
      'NB Stock',
      'Stock Transfer',
      'Reports',
      'Retailers',
      'Agent Management',
      'Users',
      'Vehicles',
      'LR Management',
      'Loading History',
      'Tanker History',
      'Deepo History',
      'Vouchers',
      'Remarks',
      'Items'
    ];

    // Combine and deduplicate
    const moduleSet = new Set();
    modules.forEach(m => moduleSet.add(m.module_name));
    allModules.forEach(m => moduleSet.add(m));

    return NextResponse.json({
      success: true,
      modules: Array.from(moduleSet).sort()
    });

  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

