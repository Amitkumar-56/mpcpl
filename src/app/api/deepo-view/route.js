import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Deepo ID is required' },
        { status: 400 }
      );
    }

    // Fetch deepo data
    const deepoData = await executeQuery(
      'SELECT * FROM deepo_history WHERE id = ?',
      [id]
    );

    if (deepoData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deepo record not found' },
        { status: 404 }
      );
    }

    const deepo = deepoData[0];

    // Fetch deepo items
    let items = [];
    if (deepo.licence_plate) {
      items = await executeQuery(
        'SELECT * FROM deepo_items WHERE vehicle_no = ?',
        [deepo.licence_plate]
      );
    }

    // Decode pdf_path JSON
    let pdfFiles = [];
    if (deepo.pdf_path) {
      try {
        pdfFiles = JSON.parse(deepo.pdf_path);
        if (!Array.isArray(pdfFiles)) {
          pdfFiles = [];
        }
      } catch (error) {
        console.error('Error parsing PDF paths:', error);
        pdfFiles = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        deepo,
        items,
        pdfFiles
      }
    });

  } catch (error) {
    console.error('Error fetching deepo data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}