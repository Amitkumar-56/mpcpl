import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Check if manufacturing_tanks table exists
      const [tableCheck] = await connection.execute(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'manufacturing_tanks'
      `);
      
      if (tableCheck[0].count === 0) {
        return NextResponse.json({
          success: false,
          error: 'manufacturing_tanks table does not exist',
          data: null
        });
      }

      // Get tanks data
      const [tanks] = await connection.execute("SELECT * FROM manufacturing_tanks ORDER BY name ASC");
      
      // Create sample tanks if none exist
      if (tanks.length === 0) {
        await connection.execute(`
          INSERT INTO manufacturing_tanks (name, capacity_kg, capacity_litre) VALUES 
          ('Tank A', 1000.00, 1000.00),
          ('Tank B', 1500.00, 1500.00),
          ('Tank C', 2000.00, 2000.00),
          ('Tank D', 2500.00, 2500.00)
        `);
        
        const [newTanks] = await connection.execute("SELECT * FROM manufacturing_tanks ORDER BY name ASC");
        
        return NextResponse.json({
          success: true,
          message: 'Sample tanks created',
          data: newTanks
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Tanks found',
        data: tanks
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error checking tanks:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    }, { status: 500 });
  }
}
