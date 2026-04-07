// src/app/api/filling-requests/activity-log/users/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all unique names using a single optimized query
    const allNamesResult = await executeQuery(`
      SELECT DISTINCT name, type FROM (
        SELECT 
          CASE 
            WHEN c.name IS NOT NULL THEN c.name
            ELSE ep_created.name 
          END as name,
          'handler' as type
        FROM filling_logs fl
        LEFT JOIN employee_profile ep_created ON fl.created_by = ep_created.id
        LEFT JOIN customers c ON fl.created_by = c.id
        WHERE fl.created_by IS NOT NULL
        
        UNION
        
        SELECT ep.name as name, 'handler' as type
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.processed_by = ep.id
        WHERE fl.processed_by IS NOT NULL
        
        UNION
        
        SELECT ep.name as name, 'handler' as type
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.completed_by = ep.id
        WHERE fl.completed_by IS NOT NULL
        
        UNION
        
        SELECT ep.name as name, 'handler' as type
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.cancelled_by = ep.id
        WHERE fl.cancelled_by IS NOT NULL
        
        UNION
        
        SELECT ep.name as name, 'handler' as type
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.updated_by = ep.id
        WHERE fl.updated_by IS NOT NULL
      ) all_names
      WHERE name IS NOT NULL AND name != ''
      ORDER BY name
    `);

    // Get unique creators specifically
    const creatorsResult = await executeQuery(`
      SELECT DISTINCT 
        COALESCE(c.name, ep.name) as name
      FROM filling_logs fl
      LEFT JOIN employee_profile ep ON fl.created_by = ep.id
      LEFT JOIN customers c ON fl.created_by = c.id
      WHERE fl.created_by IS NOT NULL
      ORDER BY name
    `);

    // Get unique processors
    const processorsResult = await executeQuery(`
      SELECT DISTINCT ep.name
      FROM filling_logs fl
      LEFT JOIN employee_profile ep ON fl.processed_by = ep.id
      WHERE fl.processed_by IS NOT NULL
      ORDER BY name
    `);

    // Get unique completers
    const completersResult = await executeQuery(`
      SELECT DISTINCT ep.name
      FROM filling_logs fl
      LEFT JOIN employee_profile ep ON fl.completed_by = ep.id
      WHERE fl.completed_by IS NOT NULL
      ORDER BY name
    `);

    return NextResponse.json({
      success: true,
      data: {
        handlers: allNamesResult.map(h => h.name).filter(Boolean),
        creators: creatorsResult.map(c => c.name).filter(Boolean),
        processors: processorsResult.map(p => p.name).filter(Boolean),
        completers: completersResult.map(c => c.name).filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Error fetching users for activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users: ' + error.message },
      { status: 500 }
    );
  }
}
