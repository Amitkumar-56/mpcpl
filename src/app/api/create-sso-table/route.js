import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Create SSO tokens table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS sso_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME NULL,
        is_used BOOLEAN DEFAULT FALSE,
        INDEX idx_user_id (user_id),
        INDEX idx_token (token),
        INDEX idx_expires_at (expires_at)
      )
    `;
    
    await executeQuery(createTableQuery);
    
    return NextResponse.json({
      success: true,
      message: 'SSO tokens table created successfully'
    });
    
  } catch (error) {
    console.error('Create Table Error:', error);
    return NextResponse.json({ 
      error: error.message,
      message: 'Failed to create SSO tokens table'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to create SSO tokens table'
  });
}
