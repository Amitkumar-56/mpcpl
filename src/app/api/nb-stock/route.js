// /app/api/nb-stock/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('API called: /api/nb-stock');
    
    // Optional: Enable authentication later
    // const session = await getSession();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Query with JOINs to get names from other tables
    const query = `
      SELECT 
        nbs.id,
        nbs.station_id,
        fs.station_name,
        nbs.product_id,
        p.pname as product_name,
        nbs.stock,
        DATE_FORMAT(nbs.created_at, '%d-%m-%Y %H:%i') as created_at_formatted,
        nbs.created_at
      FROM non_billing_stocks nbs
      LEFT JOIN products p ON nbs.product_id = p.id
      LEFT JOIN filling_stations fs ON nbs.station_id = fs.id
      ORDER BY nbs.id DESC
    `;

    console.log('Executing query:', query);
    
    const results = await executeQuery(query);
    console.log('Query results:', results);
    
    // Check if any data is missing
    const missingData = results.filter(item => 
      !item.station_name || !item.product_name
    );
    
    if (missingData.length > 0) {
      console.warn('⚠️ Missing linked data:', missingData);
    }
    
    return NextResponse.json({ 
      success: true, 
      data: results,
      count: results.length,
      warning: missingData.length > 0 ? 
        `Missing data in ${missingData.length} records` : null
    });
    
  } catch (error) {
    console.error('❌ Error in /api/nb-stock:', error);
    
    // Fallback to simple query if JOIN fails
    try {
      console.log('Trying simple query as fallback...');
      const fallbackQuery = `
        SELECT 
          id,
          station_id,
          product_id,
          stock,
          created_at
        FROM non_billing_stocks
        ORDER BY id DESC
      `;
      
      const fallbackResults = await executeQuery(fallbackQuery);
      
      return NextResponse.json({ 
        success: true, 
        data: fallbackResults,
        count: fallbackResults.length,
        message: 'Used fallback query (without joins)',
        warning: 'Could not fetch names from related tables'
      });
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Database error',
          message: error.message,
          sqlMessage: error.sqlMessage,
          suggestion: 'Check if products and filling_stations tables exist'
        },
        { status: 500 }
      );
    }
  }
}