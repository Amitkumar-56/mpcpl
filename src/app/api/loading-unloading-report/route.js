import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const party = searchParams.get('party');
    
    // Pagination params
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 25; // Default 25 per page for report
    const offset = (page - 1) * limit;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Base filter logic
    let filterClause = " WHERE 1=1";
    const params = [];

    if (startDate) {
      filterClause += " AND DATE(final_loading_datetime) >= ?";
      params.push(startDate);
    }
    if (endDate) {
      filterClause += " AND DATE(final_loading_datetime) <= ?";
      params.push(endDate);
    }
    if (party) {
      filterClause += " AND (consignee LIKE ? OR tanker LIKE ? OR driver LIKE ?)";
      params.push(`%${party}%`, `%${party}%`, `%${party}%`);
    }

    // Count query for pagination
    const countQuery = `SELECT COUNT(*) as total FROM shipment_records ${filterClause}`;
    const countResult = await executeQuery(countQuery, params);
    const totalRecords = countResult[0]?.total || 0;

    // Data query
    let dataQuery = `
      SELECT 
        shipment_id as id,
        shipment_id,
        tanker,
        driver,
        dispatch,
        driver_mobile,
        consignee,
        empty_weight_loading,
        loaded_weight_loading,
        net_weight_loading,
        density_loading,
        temperature_loading,
        final_loading_datetime,
        entered_by_loading,
        empty_weight_unloading,
        loaded_weight_unloading,
        net_weight_unloading,
        density_unloading,
        temperature_unloading,
        final_unloading_datetime,
        entered_by_unloading,
        created_at
      FROM shipment_records
      ${filterClause}
      ORDER BY final_loading_datetime DESC 
      LIMIT ? OFFSET ?
    `;
    
    // Add pagination params to the end
    const dataParams = [...params, limit, offset];
    const shipments = await executeQuery(dataQuery, dataParams);

    // Summary query (un-paginated but filtered)
    const summaryQuery = `
      SELECT 
        SUM(net_weight_loading) as total_kg,
        COUNT(*) as total_count
      FROM shipment_records 
      ${filterClause}
    `;
    const summaryResult = await executeQuery(summaryQuery, params);

    return NextResponse.json({
      success: true,
      shipments: shipments || [],
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: page,
        limit
      },
      summary: summaryResult[0] || { total_kg: 0, total_count: 0 }
    });

  } catch (error) {
    console.error('Report API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal Server Error',
      message: error.message 
    }, { status: 500 });
  }
}
