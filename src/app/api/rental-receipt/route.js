import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // Get trip details with customer information
    const tripQuery = `
      SELECT t.*, rc.name as customer_name, rc.company_name as customer_company, 
             rc.phone as customer_phone
      FROM rental_trips t
      LEFT JOIN rental_customers rc ON t.rental_customer_id = rc.id
      WHERE t.id = ?
    `;
    
    const tripResult = await executeQuery(tripQuery, [id]);
    
    if (tripResult.length === 0) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const trip = tripResult[0];

    // Get trip expenses
    const expensesQuery = `
      SELECT * FROM rental_trip_expenses 
      WHERE trip_id = ? 
      ORDER BY created_at DESC
    `;
    const expenses = await executeQuery(expensesQuery, [id]);

    // Get trip payments (advances)
    const advancesQuery = `
      SELECT * FROM rental_trip_payments 
      WHERE trip_id = ? 
      ORDER BY payment_date DESC
    `;
    const advances = await executeQuery(advancesQuery, [id]);

    return NextResponse.json({
      success: true,
      trip: {
        ...trip,
        expenses: expenses || [],
        advances: advances || []
      }
    });

  } catch (error) {
    console.error("Rental Receipt API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
