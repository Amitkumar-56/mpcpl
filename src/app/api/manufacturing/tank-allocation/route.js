import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  let connection;
  try {
    connection = await pool.getConnection();
    await ensureAllocationTable(connection);
    
    const { searchParams } = new URL(request.url);
    const viewType = searchParams.get('view') || 'allocations'; // 'allocations', 'tanks', or 'logs'
    
    if (viewType === 'tanks') {
      const [tanks] = await connection.execute('SELECT * FROM manufacturing_tanks ORDER BY name');
      
      if (tanks.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      const tankIds = tanks.map(t => t.id);
      
      // Fetch all stocks in one query
      const [allStocks] = await connection.execute(`
        SELECT * FROM manufacturing_tank_stocks 
        WHERE tank_id IN (${tankIds.map(() => '?').join(',')})
      `, tankIds);

      // Fetch all active allocations in one query
      const [allAllocations] = await connection.execute(`
        SELECT 
          ta.*,
          rmo.material_name,
          fg.product_name as finished_good_name
        FROM tank_allocation ta
        LEFT JOIN raw_materials_other rmo ON ta.material_id = rmo.id
        LEFT JOIN finished_goods fg ON ta.material_id = fg.id
        WHERE ta.tank_id IN (${tankIds.map(() => '?').join(',')}) AND ta.status = 'active'
        ORDER BY ta.created_at DESC
      `, tankIds);

      // Group data by tank_id
      const stocksMap = allStocks.reduce((acc, s) => {
        acc[s.tank_id] = s;
        return acc;
      }, {});

      const allocationsMap = allAllocations.reduce((acc, a) => {
        if (!acc[a.tank_id]) acc[a.tank_id] = [];
        acc[a.tank_id].push(a);
        return acc;
      }, {});

      const tanksWithDetails = tanks.map(tank => {
        const stock = stocksMap[tank.id] || { kg_stock: 0, litre_stock: 0 };
        const allocations = allocationsMap[tank.id] || [];
        
        const current_allocated_kg = allocations.reduce((sum, a) => sum + parseFloat(a.current_quantity_kg || 0), 0);
        const current_allocated_litre = allocations.reduce((sum, a) => sum + parseFloat(a.current_quantity_litre || 0), 0);

        return {
          id: tank.id,
          tank_name: tank.name,
          capacity_kg: tank.capacity_kg,
          capacity_litre: tank.capacity_litre,
          tank_type: tank.tank_type,
          location: tank.location,
          status: tank.status,
          current_kg_stock: stock.kg_stock,
          current_litre_stock: stock.litre_stock,
          allocations: allocations,
          allocation_count: allocations.length,
          current_allocated_kg,
          current_allocated_litre,
          available_kg: stock.kg_stock - current_allocated_kg,
          available_litre: stock.litre_stock - current_allocated_litre
        };
      });
      
      return NextResponse.json({ success: true, data: tanksWithDetails });

    } else if (viewType === 'logs') {
      const tankId = searchParams.get('tankId');
      let query = `
        SELECT al.*, t.name as tank_name
        FROM manufacturing_allocation_logs al
        LEFT JOIN manufacturing_tanks t ON al.tank_id = t.id
      `;
      const params = [];
      if (tankId) {
        query += ` WHERE al.tank_id = ?`;
        params.push(tankId);
      }
      query += ` ORDER BY al.created_at DESC LIMIT 100`;
      
      const [logs] = await connection.execute(query, params);
      return NextResponse.json({ success: true, data: logs });

    } else {
      const query = `
        SELECT 
          ta.*, 
          t.name as tank_name, 
          rmo.material_name, 
          fg.product_name as finished_good_name, 
          COALESCE(ts.kg_stock, 0) as physical_kg_stock,
          COALESCE(ts.litre_stock, 0) as physical_litre_stock
        FROM tank_allocation ta
        LEFT JOIN manufacturing_tanks t ON ta.tank_id = t.id
        LEFT JOIN manufacturing_tank_stocks ts ON ta.tank_id = ts.tank_id
        LEFT JOIN raw_materials_other rmo ON ta.material_id = rmo.id
        LEFT JOIN finished_goods fg ON ta.material_id = fg.id
        ORDER BY ta.created_at DESC
      `;
      const [rows] = await connection.execute(query);
      return NextResponse.json({ success: true, data: rows });
    }
  } catch (error) {
    console.error('Error fetching tank allocations:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch tank allocations' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

const ensureAllocationTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS tank_allocation (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tank_id INT,
      allocation_type VARCHAR(50),
      allocated_to_type VARCHAR(50) DEFAULT 'production',
      allocated_to_id INT DEFAULT 1,
      material_id INT DEFAULT NULL,
      current_quantity_kg DECIMAL(15, 2) DEFAULT 0,
      current_quantity_litre DECIMAL(15, 2) DEFAULT 0,
      allocated_quantity_kg DECIMAL(15, 2) DEFAULT 0,
      allocated_quantity_litre DECIMAL(15, 2) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      remarks TEXT,
      authorized_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const ensureLogTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS manufacturing_allocation_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      allocation_id INT,
      tank_id INT,
      action_type VARCHAR(50),
      old_values JSON,
      new_values JSON,
      remarks TEXT,
      user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

export async function POST(request) {
  let connection;
  try {
    const data = await request.json();
    const { tank_id, allocation_type, allocated_to_type, allocated_to_id, material_id, current_quantity_kg, current_quantity_litre, allocated_quantity_kg, allocated_quantity_litre, status, authorized_by, remarks } = data;

    if (!tank_id || !allocation_type || !allocated_to_type || !allocated_to_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Check if already active
    const [existing] = await connection.execute('SELECT * FROM tank_allocation WHERE tank_id = ? AND status = "active"', [tank_id]);
    if (existing.length > 0) throw new Error('Tank already has an active allocation');

    const query = `
      INSERT INTO tank_allocation (
        tank_id, allocation_type, allocated_to_type, allocated_to_id, material_id,
        current_quantity_kg, current_quantity_litre, allocated_quantity_kg, allocated_quantity_litre,
        status, authorized_by, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.execute(query, [
      tank_id, allocation_type, allocated_to_type, allocated_to_id, material_id || null,
      current_quantity_kg || 0, current_quantity_litre || 0, allocated_quantity_kg || 0, allocated_quantity_litre || 0,
      status || 'active', authorized_by || null, remarks || null
    ]);

    await ensureLogTable(connection);
    await connection.execute(
      'INSERT INTO manufacturing_allocation_logs (allocation_id, tank_id, action_type, new_values, remarks) VALUES (?, ?, ?, ?, ?)',
      [result.insertId, tank_id, 'CREATE', JSON.stringify(data), remarks || 'New Allocation']
    );

    await connection.commit();
    return NextResponse.json({ success: true, message: 'Created successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function PUT(request) {
  let connection;
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const [oldRows] = await connection.execute('SELECT * FROM tank_allocation WHERE id = ?', [id]);
    if (oldRows.length === 0) throw new Error('Allocation not found');
    const oldData = oldRows[0];

    const updateFields = [];
    const updateValues = [];
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length > 0) {
      updateValues.push(id);
      await connection.execute(`UPDATE tank_allocation SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);
      
      await ensureLogTable(connection);
      await connection.execute(
        'INSERT INTO manufacturing_allocation_logs (allocation_id, tank_id, action_type, old_values, new_values, remarks) VALUES (?, ?, ?, ?, ?, ?)',
        [id, oldData.tank_id, 'UPDATE', JSON.stringify(oldData), JSON.stringify(updateData), updateData.remarks || 'Updated']
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: 'Updated successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    await pool.execute('DELETE FROM tank_allocation WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
