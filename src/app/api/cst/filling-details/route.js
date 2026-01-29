import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log('🔍 API Called with ID:', id);
    console.log('🌐 Full URL:', request.url);
    
    if (!id) {
      console.log('❌ No ID provided');
      return NextResponse.json(
        { success: false, message: 'Request ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching filling details for ID:', id);

    // Fetch request details with all related information
    const query = `
      SELECT 
        fr.*,
        p.pname AS product_name,
        pc.pcode AS product_code,
        fs.station_name,
        c.name AS customer_name
      FROM filling_requests fr
      LEFT JOIN product_codes pc ON fr.sub_product_id = pc.id
      LEFT JOIN products p ON pc.product_id = p.id
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      LEFT JOIN customers c ON fr.cid = c.id
      WHERE fr.id = ?
    `;
    
    console.log('📊 Executing query:', query);
    
    const result = await executeQuery(query, [id]);
    console.log('📦 Filling details result:', result);
    console.log('📊 Result length:', result.length);
    
    if (result.length === 0) {
      console.log('❌ No request found with ID:', id);
      return NextResponse.json(
        { success: false, message: 'Request not found' },
        { status: 404 }
      );
    }

    const req = result[0];
    let imagesObj = {};
    if (req.images) {
      try { imagesObj = JSON.parse(req.images); } catch {}
    }
    if (!imagesObj.image1 && req.doc1) imagesObj.image1 = req.doc1;
    if (!imagesObj.image2 && req.doc2) imagesObj.image2 = req.doc2;
    if (!imagesObj.image3 && req.doc3) imagesObj.image3 = req.doc3;
    req.images = JSON.stringify(imagesObj);
    return NextResponse.json({ success: true, request: req });

  } catch (error) {
    console.error('❌ Error fetching filling details:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const id = formData.get('id');
    const status = formData.get('status');
    const aqty = formData.get('aqty');
    const remark = formData.get('remark');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Request ID is required' },
        { status: 400 }
      );
    }

    console.log('📝 Updating filling request:', { id, status, aqty, remark });

    // Check if request exists
    const checkQuery = `SELECT id FROM filling_requests WHERE id = ?`;
    const checkResult = await executeQuery(checkQuery, [id]);
    
    if (checkResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Request not found' },
        { status: 404 }
      );
    }

    // Handle image uploads
    const images = {};
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'filling-requests');
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.log('Upload directory already exists or created');
    }

    for (let i = 1; i <= 3; i++) {
      const imageFile = formData.get(`image${i}`);
      if (imageFile && imageFile.size > 0) {
        const timestamp = Date.now();
        const filename = `${id}_image${i}_${timestamp}.${imageFile.name.split('.').pop()}`;
        const filepath = path.join(uploadDir, filename);
        
        // Convert file to buffer
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Write file
        await writeFile(filepath, buffer);
        
        // Store relative path for database
        images[`image${i}`] = `/uploads/filling-requests/${filename}`;
        console.log(`✅ Uploaded image${i}:`, images[`image${i}`]);
      }
    }

    // Get existing images if any
    const existingImagesQuery = `SELECT images FROM filling_requests WHERE id = ?`;
    const existingImagesResult = await executeQuery(existingImagesQuery, [id]);
    const existingImages = existingImagesResult[0]?.images ? 
      JSON.parse(existingImagesResult[0].images) : {};

    // Merge existing images with new ones
    const finalImages = { ...existingImages, ...images };

    // Update the request
    const updateQuery = `
      UPDATE filling_requests 
      SET 
        status = ?,
        aqty = ?,
        remark = ?,
        images = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      status,
      aqty || null,
      remark || null,
      JSON.stringify(finalImages),
      id
    ]);

    console.log('✅ Filling request updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Request updated successfully',
      images: finalImages
    });

  } catch (error) {
    console.error('❌ Error updating filling request:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}
