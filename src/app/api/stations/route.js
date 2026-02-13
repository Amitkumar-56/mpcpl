// src/app/api/stations/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('role');
    
    console.log('🔍 Stations API Called:', { userId, userRole });
    
    let query = 'SELECT id, station_name, manager, phone, map_link FROM filling_stations';
    let params = [];
    let filtered = false;
    
    // If user is not admin (role 5), filter by their assigned stations
    if (userId && userRole && userRole !== '5') {
      console.log('🔒 Non-admin user - applying station filter');
      
      try {
        // Get user's assigned stations
        const userQuery = `
          SELECT fs_id 
          FROM employee_profile 
          WHERE id = ? AND fs_id IS NOT NULL AND fs_id != ''
        `;
        const userResult = await executeQuery(userQuery, [userId]);
        
        if (userResult.length > 0 && userResult[0].fs_id) {
          // Parse comma-separated station IDs
          const userStations = userResult[0].fs_id.split(',').map(id => id.trim()).filter(id => id);
          console.log('🏢 User assigned stations:', userStations);
          
          if (userStations.length > 0) {
            query += ` WHERE id IN (${userStations.map(() => '?').join(',')})`;
            params.push(...userStations);
            filtered = true;
          }
        }
      } catch (err) {
        console.error('❌ Error fetching user stations:', err);
      }
    } else {
      console.log('👑 Admin user - no filter applied');
    }
    
    query += ' ORDER BY id DESC';
    
    const rows = await executeQuery(query, params);
    console.log(`✅ Found ${rows.length} stations (filtered: ${filtered})`);
    
    return NextResponse.json({
      success: true,
      stations: rows,
      filtered: filtered,
      count: rows.length
    });
    
  } catch (err) {
    console.error('DB Fetch Error:', err);
    return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 });
  }
}
