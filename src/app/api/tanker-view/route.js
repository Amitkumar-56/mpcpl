import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tankerId = searchParams.get('id');

    if (!tankerId) {
      return NextResponse.json(
        { success: false, message: 'Tanker ID is required' },
        { status: 400 }
      );
    }

    // Fetch tanker data
    const tankerQuery = "SELECT * FROM tanker_history WHERE id = ?";
    const tankerResult = await executeQuery(tankerQuery, [parseInt(tankerId)]);

    if (tankerResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tanker record not found' },
        { status: 404 }
      );
    }

    const tankerData = tankerResult[0];

    // Fetch tanker items using licence_plate = vehicle_no
    let items = [];
    if (tankerData.licence_plate) {
      const itemsQuery = "SELECT * FROM tanker_items WHERE TRIM(vehicle_no) = ?";
      items = await executeQuery(itemsQuery, [tankerData.licence_plate.trim()]);
    }

    // Decode pdf_path JSON to array
    let pdfImages = [];
    if (tankerData.pdf_path) {
      try {
        pdfImages = JSON.parse(tankerData.pdf_path) || [];
      } catch (error) {
        console.error('Error parsing PDF path:', error);
        pdfImages = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tanker: tankerData,
        items,
        pdfImages
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching tanker data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}