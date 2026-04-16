// src/app/api/chat/upload/route.js
import { NextResponse } from "next/server";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const customerId = formData.get('customerId');

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!customerId) {
        return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    // Validate file type
    const extension = ALLOWED_TYPES[file.type];
    if (!extension) {
      return NextResponse.json({ 
        error: "Invalid file type. Allowed: JPG, PNG, GIF, WebP, PDF" 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: "File too large. Maximum size: 10MB" 
      }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}_${randomStr}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL path
    const publicPath = `/uploads/chat/${fileName}`;

    console.log(`📎 Customer chat file uploaded: ${fileName} (${(file.size / 1024).toFixed(1)}KB) for customer ${customerId}`);

    return NextResponse.json({
      success: true,
      filePath: publicPath,
      fileName: file.name || fileName,
      fileType: file.type.startsWith('image/') ? 'image' : 'file',
      fileSize: file.size
    });

  } catch (error) {
    console.error("Error uploading chat file:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
